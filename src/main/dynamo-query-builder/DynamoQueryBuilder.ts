import { DynamoDB } from "aws-sdk";

export interface AttributeQuery {
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
}

export interface IndexQuery extends AttributeQuery {
    IndexName?: string;
    KeyConditionExpression: string;
}

export interface ScanQuery extends AttributeQuery {
    FilterExpression: string;
}

export interface ConditionQuery extends AttributeQuery {
    ConditionExpression: string;
}

export interface FilterQuery extends AttributeQuery {
    FilterExpression: string;
}

export type DynamoQuery = ScanQuery | ConditionQuery | IndexQuery | FilterQuery;

export interface Parameter<T extends DynamoQuery> {
    readonly key: string;
    equals(value: number | string): Conjunction<T>;
    doesNotEquals(value: number | string): Conjunction<T>;
    equalsAny(value: number | string | number[] | string[]): Conjunction<T>;
    doesNotEqualsAll(value: number | string | number[] | string[]): Conjunction<T>;
    contains(value: string): Conjunction<T>;
    containsAny(value: string | string[]): Conjunction<T>;
    isBetween(value1: string | number, value2: string | number): Conjunction<T>;
    exists: Conjunction<T>;
    doesNotExist: Conjunction<T>;
}

export interface Conjunction<T extends DynamoQuery> {
    and(nextKey?: DynamoQuery): Conjunction<T>;
    and(nextKey: string): Parameter<T>;
    or(nextKey: DynamoQuery): Conjunction<T>;
    or(nextKey: string): Parameter<T>;
    query(): T;
}

/**
 * Creates a query parameter that can be used in a dynamo db `query` action.
 * @param partitionKey The key with which to query over.
 * @param indexName If using secondary index, this is the name of the index.
 */
export function index(partitionKey: string, indexName?: string): Parameter<IndexQuery> {
    const hiddenQuery = new HiddenIndexQuery(indexName);
    hiddenQuery.addName(partitionKey);
    return new ParameterImpl(hiddenQuery, partitionKey);
}

/**
 * Creates a query parameter with a "FilterExpression" attribute.
 * @param initialKey The initial key to use.
 */
export function filter(initialKey: string): Parameter<FilterQuery> {
    const hiddenQuery = new HiddenFilterQuery();
    hiddenQuery.addName(initialKey);
    return new ParameterImpl(hiddenQuery, initialKey);
}

/**
 * Creates a query parameter that can be used for dynamo db `scan` actions.
 * @param initialKey The initial key to start with or a previous scan query to be merged with this one.
 * @param inclusive If `initialKey` is a ScanQuery and this is true, then the resulting condition will essentially
 * put the ScanQuery in parenthesis meaning it will have to be executed in full.
 */
export function scan(initialKey: string): Parameter<ScanQuery>;
export function scan(initialKey: ScanQuery, inclusive?: boolean): Conjunction<ScanQuery>;
export function scan(initialKey: string | ScanQuery, inclusive?: boolean): Parameter<ScanQuery> | Conjunction<ScanQuery> {
    if (typeof initialKey === "string") {
        const hiddenQuery = new HiddenScanQuery();
        hiddenQuery.addName(initialKey);
        return new ParameterImpl(hiddenQuery, initialKey);
    } else {
        const hiddenQuery = new HiddenScanQuery(initialKey, inclusive);
        return new ConjunctionImpl(hiddenQuery);
    }
}

/**
 * Creates a query parameter that can be used for any dynamoDb action that has a `ConditionExpression`.
 * @param initialKey The initial key to start with or a previous condition query to be merged with this one.
 * @param inclusive If `initialKey` is a ConditionQuery and this is true, then the resulting condition will essentially
 * put the ConditionQuery in parenthesis meaning it will have to be executed in full.
 */
export function withCondition(initialKey: string): Parameter<ConditionQuery>;
export function withCondition(initialKey: ConditionQuery, inclusive?: boolean): Conjunction<ConditionQuery>;
export function withCondition(initialKey: string | ConditionQuery, inclusive?: boolean): Parameter<ConditionQuery> | Conjunction<ConditionQuery> {
    if (typeof initialKey === "string") {
        const hiddenQuery = new HiddenConditionQuery();
        hiddenQuery.addName(initialKey);
        return new ParameterImpl(hiddenQuery, initialKey);
    } else {
        const hiddenQuery = new HiddenConditionQuery(initialKey, inclusive);
        return new ConjunctionImpl(hiddenQuery);
    }
}

// export function mergeExpressionAttributes(...{Ex})

type Code = string;

abstract class HiddenQuery<T extends DynamoQuery> {
    private ExpressionAttributeNames: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    private ExpressionAttributeValues: DynamoDB.DocumentClient.ExpressionAttributeValueMap;

    private readonly cachedNames: {
        [key: string]: string;
    };

    private nameCount: number;
    private valueCount: number;

    constructor(query?: AttributeQuery) {
        this.ExpressionAttributeNames = {};
        this.cachedNames = {};
        this.nameCount = 0;
        this.valueCount = 0;

        if (query) {
            this.ExpressionAttributeNames = { ...query.ExpressionAttributeNames };
            this.ExpressionAttributeValues = { ...query.ExpressionAttributeValues };

            const codes = Object.keys(this.ExpressionAttributeNames);
            this.nameCount = codes.length;
            this.valueCount = Object.keys(this.ExpressionAttributeValues).length;

            codes.forEach((code) => {
                const name = this.ExpressionAttributeNames[code];
                this.cachedNames[name] = code;
            });
        }

        this.getCode = this.getCode.bind(this);
        this.addName = this.addName.bind(this);
        this.addValue = this.addValue.bind(this);
        this.build = this.build.bind(this);
    }

    abstract addExpression(expression: string): void;

    abstract get expression(): string;

    abstract get prefix(): string;

    getCode(key: string): string {
        let codes: string[] = key.split(".").map((key) => { return this.cachedNames[key]; });
        return codes.join(".");
    }

    addName(fullKey: string): Code[] {
        const codes: Code[] = [];
        fullKey.split(".").forEach((key) => {
            let code = this.cachedNames[key];
            if (!code) {
                code = `#${this.prefix}NC${this.nameCount}`;
                this.cachedNames[key] = code;
                this.ExpressionAttributeNames[code] = key;
                ++this.nameCount;
            }
            codes.push(code);
        });
        return codes;
    }

    addValue(value: string | number): Code {
        const code = `:${this.prefix}VC${this.valueCount}`;
        if (!this.ExpressionAttributeValues) {
            this.ExpressionAttributeValues = {};
        }
        this.ExpressionAttributeValues[code] = value;
        ++this.valueCount;
        return code;
    }

    protected abstract buildObj(): T;

    build(): T {
        const returnObj: T = this.buildObj();
        returnObj.ExpressionAttributeNames = this.ExpressionAttributeNames;
        // DynamoDB is extremely picky about having empty or undefined keys.  Don't include it if it doesn't exist.
        if (this.ExpressionAttributeValues) {
            returnObj.ExpressionAttributeValues = this.ExpressionAttributeValues;
        }
        return returnObj;
    }
}

class HiddenScanQuery extends HiddenQuery<ScanQuery> {
    private FilterExpression: string;
    readonly prefix = "___scan_";

    constructor(query?: ScanQuery, inclusive?: boolean) {
        super(query);
        if (query) {
            if (inclusive) {
                this.FilterExpression = "(" + query.FilterExpression + ")";
            } else {
                this.FilterExpression = query.FilterExpression;
            }
        } else {
            this.FilterExpression = "";
        }
    }

    addExpression(expression: string) {
        this.FilterExpression += expression;
    }

    get expression(): string {
        return this.FilterExpression;
    }

    buildObj(): ScanQuery {
        return {
            FilterExpression: this.FilterExpression
        };
    }
}

class HiddenConditionQuery extends HiddenQuery<ConditionQuery> {
    private ConditionExpression: string;
    readonly prefix = "___cond_";

    constructor(query?: ConditionQuery, inclusive?: boolean) {
        super(query);
        if (query) {
            if (inclusive) {
                this.ConditionExpression = "(" + query.ConditionExpression + ")";
            } else {
                this.ConditionExpression = query.ConditionExpression;
            }
        } else {
            this.ConditionExpression = "";
        }
    }

    addExpression(expression: string) {
        this.ConditionExpression += expression;
    }

    get expression(): string {
        return this.ConditionExpression;
    }

    buildObj(): ConditionQuery {
        return {
            ConditionExpression: this.ConditionExpression
        };
    }
}

class HiddenIndexQuery extends HiddenQuery<IndexQuery> {
    private IndexName: string;
    private KeyConditionExpression: string;
    private caughtKeys: { [key: string]: string };
    readonly prefix = "___index_";

    constructor(indexName: string) {
        super();
        this.IndexName = indexName;
        this.KeyConditionExpression = "";
        this.caughtKeys = {};
        this.addName = this.addName.bind(this);
        this.getCode = this.getCode.bind(this);
    }

    addName(name: string) {
        // We're not allowed to use expressions in Key Conditions so we're going to ignore that here.
        // Names have to be presented as-is in the expression.
        this.caughtKeys[name] = name;
        return [name];
    }

    getCode(key: string) {
        return this.caughtKeys[key];
    }

    addExpression(expression: string) {
        this.KeyConditionExpression += expression;
    }

    get expression(): string {
        return this.KeyConditionExpression;
    }

    buildObj(): IndexQuery {
        const query: IndexQuery = {
            KeyConditionExpression: this.KeyConditionExpression
        };
        if (this.IndexName) {
            query.IndexName = this.IndexName;
        }
        return query;
    }
}

class HiddenFilterQuery extends HiddenQuery<FilterQuery> {
    private FilterExpression: string;
    readonly prefix = "___filter_";

    constructor() {
        super();
        this.FilterExpression = "";
    }

    addExpression(expression: string) {
        this.FilterExpression += expression;
    }

    get expression(): string {
        return this.FilterExpression;
    }

    buildObj(): FilterQuery {
        return {
            FilterExpression: this.FilterExpression
        };
    }
}

class ParameterImpl implements Parameter<any> {

    private readonly scanQuery: HiddenQuery<any>;

    readonly key: string;
    readonly code: string;

    constructor(scanQuery: HiddenQuery<any>, key: string) {
        this.scanQuery = scanQuery;
        this.key = key;
        this.code = scanQuery.getCode(this.key);

        this.equals = this.equals.bind(this);
        this.equalsAny = this.equalsAny.bind(this);
        this.doesNotEquals = this.doesNotEquals.bind(this);
        this.doesNotEqualsAll = this.doesNotEqualsAll.bind(this);
        this.contains = this.contains.bind(this);
        this.containsAny = this.containsAny.bind(this);
    }

    equals(value: string | number): Conjunction<any> {
        const valueCode = this.scanQuery.addValue(value);
        this.scanQuery.addExpression(this.code + "=" + valueCode);
        return new ConjunctionImpl(this.scanQuery);
    }

    doesNotEquals(value: string | number): Conjunction<any> {
        const valueCode = this.scanQuery.addValue(value);
        this.scanQuery.addExpression(this.code + "<>" + valueCode);
        return new ConjunctionImpl(this.scanQuery);
    }

    equalsAny(values: string | number | string | number[]): Conjunction<any> {
        return this.any<string | number>(this.equals, values);
    }

    doesNotEqualsAll(value: string | number | string | number[]): Conjunction<any> {
        return this.all<string | number>(this.doesNotEquals, value);
    }

    contains(value: string): Conjunction<any> {
        const valueCode = this.scanQuery.addValue(value);
        this.scanQuery.addExpression("contains(" + this.code + "," + valueCode + ")");
        return new ConjunctionImpl(this.scanQuery);
    }

    containsAny(values: string | string[]): Conjunction<any> {
        return this.any<string>(this.contains, values);
    }

    get exists(): Conjunction<any> {
        this.scanQuery.addExpression("attribute_exists(" + this.code + ")");
        return new ConjunctionImpl(this.scanQuery);
    }

    get doesNotExist(): Conjunction<any> {
        this.scanQuery.addExpression("attribute_not_exists(" + this.code + ")");
        return new ConjunctionImpl(this.scanQuery);
    }

    isBetween(value1: string | number, value2: string | number) {
        const valueCode1 = this.scanQuery.addValue(value1);
        const valueCode2 = this.scanQuery.addValue(value2);
        this.scanQuery.addExpression(this.code + " BETWEEN " + valueCode1 + " AND " + valueCode2);
        return new ConjunctionImpl(this.scanQuery);
    }

    private any<T>(func: (value: T) => Conjunction<any>, values: T | T[]): Conjunction<any> {
        let returnCon: Conjunction<any>;
        const allValues = [].concat(values);
        const totalMinusOne = allValues.length - 1;
        // Hmm... The fact we have to do it like this kind of implies it's a bad API though it's extremely convenient to use in specific cases.
        allValues.forEach((v: T, index: number) => {
            returnCon = func(v);
            if (index < totalMinusOne) {
                returnCon.or(this.key);
            }
        });
        return returnCon;
    }

    private all<T>(func: (value: T) => Conjunction<any>, values: T | T[]): Conjunction<any> {
        let returnCon: Conjunction<any>;
        const allValues = [].concat(values);
        const totalMinusOne = allValues.length - 1;
        // Hmm... The fact we have to do it like this kind of implies it's a bad API though it's extremely convenient to use in specific cases.
        allValues.forEach((v: T, index: number) => {
            returnCon = func(v);
            if (index < totalMinusOne) {
                returnCon.and(this.key);
            }
        });
        return returnCon;
    }
}

class ConjunctionImpl implements Conjunction<any> {

    private readonly scanQuery: HiddenQuery<any>;

    constructor(scanQuery: HiddenQuery<any>) {
        this.scanQuery = scanQuery;
    }

    and(nextKey: string): Parameter<any>;
    and(nextKey: DynamoQuery): Conjunction<any>;
    and(nextKey: string | DynamoQuery): Parameter<any> | Conjunction<any> {
        return this.conjunct("AND", nextKey);
    }

    or(nextKey: string): Parameter<any>;
    or(nextKey: DynamoQuery): Conjunction<any>;
    or(nextKey: string | DynamoQuery): Parameter<any> | Conjunction<any> {
        return this.conjunct("OR", nextKey);
    }

    query<T extends AttributeQuery>(): T {
        return this.scanQuery.build();
    }

    private conjunct(conjunction: "OR" | "AND", nextKey: string | DynamoQuery): Parameter<any> | Conjunction<any> {
        if (typeof nextKey === "string") {
            this.scanQuery.addName(nextKey);
            this.scanQuery.addExpression(" " + conjunction + " ");
            return new ParameterImpl(this.scanQuery, nextKey);
        } else {
            if (nextKey) {
                this.scanQuery.addExpression(" " + conjunction + " (" + this.mergeExpressions(nextKey) + ")");
            }
            return new ConjunctionImpl(this.scanQuery);
        }
    }

    private mergeExpressions(query: DynamoQuery) {
        let filterExpression = getExpression(query);
        // const regex = /(#[a-z0-9]*)(\s*[=]?\s*)(:[a-z0-9]*)?/gi;
        const regex = /((:|#)[a-z0-9-_]*)/gi;
        const split = filterExpression.split(" ");
        const conjunctRegex = /AND|OR/gi;
        let newExpression = "";
        split.forEach((s) => {
            if (s.match(conjunctRegex)) {
                // conjunction
                newExpression += " " + s + " ";
            } else {
                const match = s.match(regex);
                let fullExpression = s;
                match.forEach((code) => {
                    const map: any = (code.startsWith("#")) ? query.ExpressionAttributeNames : query.ExpressionAttributeValues;
                    const addFunc: (key: string) => Code | Code[] = (code.startsWith("#")) ? this.scanQuery.addName : this.scanQuery.addValue;
                    const newCodes: Code | Code[] = addFunc(map[code]);
                    [].concat(newCodes).forEach((newCode) => fullExpression = fullExpression.replace(code, newCode));
                });
                newExpression += fullExpression;
            }
        });
        return newExpression;
    }
}

function getExpression(query: DynamoQuery) {
    if (isConditionExpression(query)) {
        return query.ConditionExpression;
    } else if (isIndexExpression(query)) {
        return query.KeyConditionExpression;
    } else {
        return query.FilterExpression;
    }
}

function isConditionExpression(query: DynamoQuery): query is ConditionQuery {
    return query.hasOwnProperty("ConditionExpression");
}

function isIndexExpression(query: DynamoQuery): query is IndexQuery {
    return query.hasOwnProperty("KeyCondtionExpression");
}