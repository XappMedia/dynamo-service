import { DynamoDB } from "aws-sdk";

import { objHasAttrs } from "../utils/Object";
import { UpdateReturnType } from "./TableService";

export type ConstructorDB = DynamoDB | DynamoDB.DocumentClient;

export interface QueryResult<T> {
    Items: T[];
    LastEvaluatedKey?: object;
}

export interface ScanResult<T> {
    Items: T[];
    LastEvaluatedKey?: object;
}

export interface QueryParams {
    IndexName?: string;
    FilterExpression?: string;
    KeyConditionExpression: string;
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
    ScanIndexForward?: boolean;
    Limit?: number;
}

export interface ScanParams {
    FilterExpression?: DynamoDB.DocumentClient.ConditionExpression;
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
    Limit?: number;
}

export interface ConditionExpression {
    ConditionExpression?: DynamoDB.DocumentClient.ConditionExpression;
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
}

export type Set<T> = Partial<T>;
export type Remove<T> = (keyof T)[];
export type Append<T> = Partial<T>;

/**
 * A common model for an "update" action.
 */
export interface UpdateBody<T> {
    /**
     * Set the value to the item listed.
     *
     * In the format:
     *
     * {
     *    [databaseColumnId]: value
     * }
     */
    set?: Set<T>;
    /**
     * Remove the value entirely from the database.
     *
     * In the format:
     *
     * {
     *    [databaseColumnId]: value
     * }
     */
    remove?: Remove<T>;
    /**
     * Add a collection of items to an array.
     *
     * In the format:
     *
     * {
     *    [databaseColumnId]: value[]
     * }
     */
    append?: Append<T>;
}

/**
 * The type of return that an update action should return.
 *
 * ALL_NEW - The newly updated object is returns.
 * ALL_OLD - The old object before it was update is returned.
 * UPDATED_OLD - only the attributes which were updated are returned. The values will be pre-updated values.
 * UPDATED_NEW - only the attributed which were updated are returned.  The values will be the updated values.
 * NONE - Don't return anything.
 */
export type UpdateReturnType = DynamoDB.DocumentClient.ReturnValue;

/**
 * The object returned from "getUpdateParameters".
 */
interface UpdateParameters {
    UpdateExpression: string;
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
}

export class DynamoService {
    readonly db: DynamoDB.DocumentClient;

    constructor(db: ConstructorDB) {
        this.db = getDb(db);
    }

    put(table: string, obj: DynamoDB.DocumentClient.PutItemInputAttributeMap, condition: ConditionExpression = {}): Promise<DynamoDB.DocumentClient.PutItemOutput> {
        const params: DynamoDB.PutItemInput = {
            TableName: table,
            Item: obj,
            ...condition
        };
        return this.db.put(params).promise();
    }

    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, condition: ConditionExpression): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: "NONE"): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, condition: ConditionExpression, returns: "NONE"): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: "UPDATED_OLD" | "UPDATED_NEW"): Promise<Partial<T>>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, condition: ConditionExpression, returns: "UPDATED_OLD" | "UPDATED_NEW"): Promise<Partial<T>>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: "ALL_OLD" | "ALL_NEW"): Promise<T>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, condition: ConditionExpression, returns: "UPDATED_OLD" | "UPDATED_NEW"): Promise<Partial<T>>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: string): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, condition: ConditionExpression, returns: string): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, conditionOrReturns: ConditionExpression | UpdateReturnType = {}, returns: UpdateReturnType = "NONE"): Promise<void> | Promise<T> | Promise<Partial<T>> {
        const newUpdate = transferUndefinedToRemove(update);
        newUpdate.set = removeUndefinedAndBlanks(update.set);
        const updateExpression = getUpdateParameters(newUpdate);
        const conditionExpression = (typeof conditionOrReturns === "object") ? conditionOrReturns : {};
        const ReturnValues = (typeof conditionOrReturns === "object") ? returns : conditionOrReturns;

        const params: DynamoDB.UpdateItemInput = {
            TableName: table,
            Key: key,
            ReturnValues,
            ...updateExpression
        };
        if (objHasAttrs(conditionExpression)) {
            params.ConditionExpression = conditionExpression.ConditionExpression;
            params.ExpressionAttributeNames = { ...params.ExpressionAttributeNames, ...conditionExpression.ExpressionAttributeNames };
            params.ExpressionAttributeValues = { ...params.ExpressionAttributeValues, ...conditionExpression.ExpressionAttributeValues };
        }
        return this.db.update(params).promise().then((item) => { return item.Attributes as T; });
    }

    get<T>(table: string, key: DynamoDB.DocumentClient.Key): Promise<T>;
    get<T>(table: string, key: DynamoDB.DocumentClient.Key[]): Promise<T[]>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key, projection: P | P[]): Promise<Pick<T, P>>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key[], projection: P | P[]): Promise<Pick<T, P>[]>;
    get<T, P extends keyof T>(TableName: string, Key: DynamoDB.DocumentClient.Key | DynamoDB.DocumentClient.Key[], projection?: P | P[]): Promise<Pick<T, P>> | Promise<T> | Promise<T[]> | Promise<Pick<T, P>[]> {
        if (Array.isArray(Key)) {
            const exp: ProjectionParameters = getProjectionExpression(projection);
            const items: DynamoDB.DocumentClient.BatchGetItemInput = {
                RequestItems: {
                    [TableName]: {
                        Keys: Key,
                        ...exp
                    }
                },
            };
            return this.db.batchGet(items).promise().then((data) => {
                return data.Responses[TableName] as T[];
            });
        }

        const params: DynamoDB.GetItemInput = {
            TableName,
            Key,
            ...getProjectionExpression(projection)
        };
        return this.db.get(params).promise().then((item) => item.Item as T );
    }

    query<T, P extends keyof T>(table: string, myParams: QueryParams): Promise<QueryResult<T>>;
    query<T, P extends keyof T>(table: string, myParams: QueryParams, projection: P | P[]): Promise<QueryResult<Pick<T, P>>>;
    query<T, P extends keyof T>(table: string, myParams: QueryParams, projection?: P | P[]): Promise<QueryResult<T>> | Promise<QueryResult<Pick<T, P>>> {
        const params: DynamoDB.QueryInput = {
            TableName: table
        };
        addIfExists(params, myParams, [
            "IndexName",
            "KeyConditionExpression",
            "FilterExpression",
            "ExpressionAttributeNames",
            "ExpressionAttributeValues",
            "ScanIndexForward",
            "Limit"]);

        if (projection) {
            const proj = getProjectionExpression(projection);
            params.ExpressionAttributeNames = {...proj.ExpressionAttributeNames, ...params.ExpressionAttributeNames};
            params.ProjectionExpression = proj.ProjectionExpression;
        }
        return this.db.query(params).promise().then((item): QueryResult<T> => {
            return {
                Items: item.Items as T[],
                LastEvaluatedKey: item.LastEvaluatedKey
            };
        });
    }

    scan<T>(table: string, myParams: ScanParams): Promise<ScanResult<T>>;
    scan<T, P extends keyof T>(table: string, myParams: ScanParams, projection: P | P[]): Promise<ScanResult<Pick<T, P>>>;
    scan<T, P extends keyof T>(table: string, myParams: ScanParams, projection?: P | P[]): Promise<ScanResult<T>> | Promise<ScanResult<Pick<T, P>>> {
        const params: DynamoDB.ScanInput = {
            TableName: table,
        };
        addIfExists(params, myParams, ["FilterExpression", "ExpressionAttributeNames", "ExpressionAttributeValues", "Limit"]);
        if (projection) {
            const proj = getProjectionExpression(projection);
            params.ExpressionAttributeNames = {...proj.ExpressionAttributeNames, ...params.ExpressionAttributeNames};
            params.ProjectionExpression = proj.ProjectionExpression;
        }
        return this.db.scan(params).promise().then((item): ScanResult<T> => {
            return {
                Items: item.Items as T[],
                LastEvaluatedKey: item.LastEvaluatedKey
            };
        });
    }

    delete(TableName: string, Key: DynamoDB.DocumentClient.Key): Promise<void> {
        return this.db.delete({
            TableName,
            Key
        }).promise().then(r => { });
    }
}

function addIfExists<O, P>(original: O, params: P, keys: (keyof O)[] = []): O {
    const p: any = params || {};
    keys.forEach((key: keyof O) => {
        const v = p[key];
        if (v !== null && v !== undefined) {
            original[key] = v;
        }
    });
    return original;
}

function getDb(db: ConstructorDB): DynamoDB.DocumentClient {
    if (db instanceof DynamoDB) {
        return new DynamoDB.DocumentClient({ service: db });
    } else if (db instanceof DynamoDB.DocumentClient) {
        return db;
    } else {
        throw new Error("Could not construct DynamoService.  Bad input.");
    }
}

/**
 * A Utility method that will retrieve an UpdateBody and convert to the
 * Expression attributes for a DynamoDB update.
 *
 * You can just apply the object like so:
 *
 * const parameters = getUpdateParameters(body);
 * const params: DynamoDB.DocumentClient.UpdateItemInput = {
 *    ...parameters
 * }
 *
 * @param body The body to include.
 * @return An object that contains the attributes:
 *      {
 *          UpdateExpression: items to update.
 *          ExpressionAttributeValues:  The values of such items.
 *          ExpressionAttributeNames: The names that are mapped to those expressions.
 *      }
 */
function getUpdateParameters<T>(body: UpdateBody<T>): UpdateParameters {
    let setValues: { [key: string]: any };
    let setAliasMap: { [key: string]: string };
    let setExpression: string;
    const { set, append, remove } = body;
    if (objHasAttrs(set)) {
        setValues = {};
        setAliasMap = {};
        setExpression = "set ";
        let index = 0;
        for (const key in set) {
            if (set.hasOwnProperty(key)) {
                const alias = "#__dynoservice_" + key;
                const name = ":__dynoservice_a" + ++index;
                setExpression += alias + " = " + name + ",";
                setValues[name] = set[key];
                setAliasMap[alias] = key;
            }
        }
    }

    if (objHasAttrs(append)) {
        setValues = setValues || {};
        setAliasMap = setAliasMap || {};
        setExpression = setExpression || "set ";
        let index = 0;
        for (const key in append) {
            if (append.hasOwnProperty(key)) {
                const alias = "#__dynoservice_append_" + key;
                const name = ":__dynoservice_c" + ++index;
                setExpression += alias + " = list_append(if_not_exists(" + alias + ", :__dynoservice_append_empty_list)," + name + "),";
                setValues[name] = append[key];
                setValues[":__dynoservice_append_empty_list"] = [];
                setAliasMap[alias] = key;
            }
        }
    }

    if (remove && remove.length > 0) {
        setValues = setValues || {};
        setAliasMap = setAliasMap || {};
        setExpression = setExpression ? setExpression.substr(0, setExpression.length - 1) + " remove " : "remove ";
        remove.forEach((key: string) => {
            const alias = "#__dynoservice_" + key;
            setExpression += alias + ",";
            setAliasMap[alias] = key;
        });
    }

    if (setExpression) {
        setExpression = setExpression.substr(0, setExpression.length - 1); // Removes the last "," on the string.
    }

    let returnValue: UpdateParameters = { UpdateExpression: setExpression };
    if (objHasAttrs(setValues)) {
        returnValue = { ...returnValue, ...{ ExpressionAttributeValues: setValues } };
    }
    if (objHasAttrs(setAliasMap)) {
        returnValue = { ...returnValue, ...{ ExpressionAttributeNames: setAliasMap } };
    }
    return returnValue;
}

/**
 * An expression that can be used with queries that contains a projection expression.
 */
interface ProjectionParameters {
    ProjectionExpression?: string;
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
}

/**
 * Recursively removes the undefined and blank strings from an object.
 */
function removeUndefinedAndBlanks<T>(obj: T): T {
    const returnObj: Partial<T> = {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value: any = convertValue(obj[key]);
            if (value !== undefined) {
                returnObj[key] = value;
            }
        }
    }
    return returnObj as T;
}

/**
 * Strips a value of all blanks and undefined then returns it.
 * 
 * This is a weird double recursive function with `removeUndefinedAndBlanks` so recommended to not expose to the wild.
 * @param v The javascript object ot check.
 */
function convertValue(v: any) {
    if (Array.isArray(v)) {
        return v.reduce((last, v) => {
            const newV = convertValue(v);
            if (newV !== undefined) {
                last.push(newV);
            }
            return last;
        }, []);
    } else if (typeof v === "object") {
        return removeUndefinedAndBlanks(v);
    } else if (typeof v !== "string" || v.length > 0) {
        return v;
    }
    return undefined;
}

/**
 * Generate a projection expression given the series of strings that are to be projected.
 * @param projectionExpression The values to use in the projection expression.
 */
function getProjectionExpression(projectionExpression: string | string[]): ProjectionParameters {
    if (!projectionExpression) {
        return {
        };
    }

    let ProjectionExpression: string = "";
    let ExpressionAttributeNames: any = {};
    const expression = [].concat(projectionExpression);
    expression.forEach((value: string, index: number) => {
        const key = "#__dynoservice_proj" + index;
        ExpressionAttributeNames[key] = value;
        ProjectionExpression += key;
        if (index < expression.length - 1) {
            ProjectionExpression += ",";
        }
    });
    return { ProjectionExpression, ExpressionAttributeNames };
}

/**
 * This will transfer all undefined, null, empty strings, -0, and NaN from the "set" item to the "remove" so they'll be deleted
 * instead of crashing dynamo.
 * @param body  The update body to use.
 */
function transferUndefinedToRemove<T>(body: UpdateBody<T>): UpdateBody<T> {
    const set: Set<T> = { ...body.set as any };
    const remove: string[] = (body.remove || []).slice();

    const setKeys = Object.keys(set);
    for (const key of setKeys) {
        const item = set[key as keyof T] as any;
        if (!item) {
            if (typeof item !== typeof true && item !== 0) {
                // Boolean "false" and numbers "0" and "-0" are the only falsey that we like.
                remove.push(key);
                delete set[key as keyof T];
            }
        }
    }
    return { ...body, set, remove } as UpdateBody<T>;
}
