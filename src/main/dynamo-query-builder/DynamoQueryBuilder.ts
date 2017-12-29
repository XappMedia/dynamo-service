import { DynamoDB } from "aws-sdk";

export interface AttributeQuery {
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
}

export interface ScanQuery extends AttributeQuery {
    FilterExpression: string;
}

export interface ConditionQuery extends AttributeQuery {
    ConditionExpression: string;
}

export type DynamoQuery = ScanQuery | ConditionQuery;

export interface Parameter<T extends DynamoQuery> {
    readonly key: string;
    equals(value: number | string): Conjunction<T>;
    doesNotEquals(value: number | string): Conjunction<T>;
    equalsAny(value: number | string | number[] | string[]): Conjunction<T>;
    doesNotEqualsAll(value: number | string | number[] | string[]): Conjunction<T>;
    contains(value: string): Conjunction<T>;
    containsAny(value: string | string[]): Conjunction<T>;
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

    getCode(key: string): string {
        let codes: string[] = key.split(".").map((key) => { return this.cachedNames[key]; });
        return codes.join(".");
    }

    addName(fullKey: string): Code[] {
        const codes: Code[] = [];
        fullKey.split(".").forEach((key) => {
            let code = this.cachedNames[key];
            if (!code) {
                code = "#NC" + this.nameCount;
                this.cachedNames[key] = code;
                this.ExpressionAttributeNames[code] = key;
                ++this.nameCount;
            }
            codes.push(code);
        });
        return codes;
    }

    addValue(value: string | number): Code {
        const code = ":VC" + this.valueCount;
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
        let filterExpression = isConditionExpression(query) ? query.ConditionExpression : query.FilterExpression;
        // const regex = /(#[a-z0-9]*)(\s*[=]?\s*)(:[a-z0-9]*)?/gi;
        const regex = /((:|#)[a-z0-9]*)/gi;
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

function isConditionExpression(query: DynamoQuery): query is ConditionQuery {
    return query.hasOwnProperty("ConditionExpression");
}