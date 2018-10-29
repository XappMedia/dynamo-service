import { DynamoDB } from "aws-sdk";

import { exponentialTime } from "../utils/Backoff";
import { sleep } from "../utils/Sleep";

import { objHasAttrs } from "../utils/Object";
import { randomString } from "../utils/String";
import { UpdateReturnType } from "./TableService";
import { ValidationError } from "./ValidationError";

export const MAX_PUT_ALL_ATTEMPTS = 15;

export type ConstructorDB = DynamoDB | DynamoDB.DocumentClient;

export interface QueryResult<T> {
    Items: T[];
    LastEvaluatedKey?: DynamoDB.DocumentClient.Key;
}

export interface ScanResult<T> {
    Items: T[];
    LastEvaluatedKey?: DynamoDB.DocumentClient.Key;
}

export interface QueryParams {
    IndexName?: string;
    FilterExpression?: string;
    KeyConditionExpression: string;
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
    ScanIndexForward?: boolean;
    Limit?: number;
    ExclusiveStartKey?: DynamoDB.DocumentClient.Key;
}

export interface ScanParams {
    IndexName?: string;
    FilterExpression?: DynamoDB.DocumentClient.ConditionExpression;
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
    Limit?: number;
    ExclusiveStartKey?: DynamoDB.DocumentClient.Key;
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
 * An interceptor is a function that takes an object and inspects it before continuing.
 * An interceptor can be used to validate an object before the final action is committed or
 * it can be used to transform the object.
 */
export type Interceptor<T> = (obj: T) => T;

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

export interface PutAllServiceProps {
    /**
     * When attempting to put an array of elements in the
     * service, this will be the number of times to attempt before
     * giving up.
     *
     * If this number is reached, then the unprocessed items will be
     * returned in the result.
     *
     * To save dramatics spikes in DynamoDB, this uses an exponential backoff
     * algorithm so it takes progressively longer to load at each attempt.
     *
     * @type {number}
     * @memberof PutAllServiceProps
     */
    attempts?: number;
}

export class DynamoService {
    readonly db: DynamoDB.DocumentClient;

    private readonly putInterceptors: Interceptor<any>[];

    constructor(db: ConstructorDB) {
        this.db = getDb(db);
        this.putInterceptors = [];
    }

    /**
     * This adds an interceptor that can intercept objects being sent to Dynamo db in a PUT* operation.
     *
     * The order in which these are inserted will be the order in which the interceptors will be executed.
     *
     * @template T
     * @param {Interceptor<T>} interceptor
     * @memberof DynamoService
     */
    addPutInterceptor<T>(interceptor: Interceptor<T>) {
        if (!interceptor) {
            throw new Error("Put interceptor is undefined.");
        }
        this.putInterceptors.push(interceptor);
    }

    put(TableName: string, obj: DynamoDB.DocumentClient.PutItemInputAttributeMap): Promise<DynamoDB.DocumentClient.PutItemOutput>;
    put(TableName: string, obj: DynamoDB.DocumentClient.PutItemInputAttributeMap, condition: ConditionExpression): Promise<DynamoDB.DocumentClient.PutItemOutput>;
    put(TableName: string, obj: DynamoDB.DocumentClient.PutItemInputAttributeMap[]): Promise<DynamoDB.DocumentClient.PutItemInputAttributeMap[]>;
    put(TableName: string, obj: DynamoDB.DocumentClient.PutItemInputAttributeMap[], props: PutAllServiceProps): Promise<DynamoDB.DocumentClient.PutItemInputAttributeMap[]>;
    put(TableName: string, obj: DynamoDB.DocumentClient.PutItemInputAttributeMap | DynamoDB.DocumentClient.PutItemInputAttributeMap[], condition: ConditionExpression | PutAllServiceProps = {}): Promise<DynamoDB.DocumentClient.PutItemOutput> | Promise<DynamoDB.DocumentClient.PutItemInputAttributeMap[]> {
        const putObjs = interceptObj(this.putInterceptors, obj);
        if (Array.isArray(putObjs)) {
            return this.batchWrites(TableName, createPutBatchWriteRequests(putObjs), condition as PutAllServiceProps).then(unprocessed =>  {
                const unProcessedItems: DynamoDB.DocumentClient.PutItemInputAttributeMap[] = [];
                for (let u of unprocessed) {
                    unProcessedItems.push(u.PutRequest.Item);
                }
                return unProcessedItems;
            });
        }

        const params: DynamoDB.PutItemInput = {
            TableName,
            Item: putObjs,
            ...condition as ConditionExpression
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
    get<T, P extends keyof T>(tableName: string, Key: DynamoDB.DocumentClient.Key | DynamoDB.DocumentClient.Key[], projection?: P | P[]): Promise<Pick<T, P>> | Promise<T> | Promise<T[]> | Promise<Pick<T, P>[]> {
        if (Array.isArray(Key)) {
            const exp: ProjectionParameters = getProjectionExpression(projection);
            const items: DynamoDB.DocumentClient.BatchGetItemInput = {
                RequestItems: {
                    [tableName]: {
                        Keys: Key,
                        ...exp
                    }
                },
            };
            return this.db.batchGet(items).promise().then((data) => {
                return data.Responses[tableName] as T[];
            });
        }

        const params: DynamoDB.GetItemInput = {
            TableName: tableName,
            Key,
            ...getProjectionExpression(projection)
        };
        return this.db.get(params).promise().then((item) => item.Item as T );
    }

    getAll<T>(tableName: string, key: DynamoDB.DocumentClient.Key[]): Promise<T[]>;
    getAll<T, P extends keyof T>(tableName: string, key: DynamoDB.DocumentClient.Key[], projection: P | P[]): Promise<Pick<T, P>[]>;
    getAll<T, P extends keyof T>(tableName: string, key: DynamoDB.DocumentClient.Key[], projection?: P | P[]): Promise<T[]> | Promise<Pick<T, P>[]> {
        return this.get(tableName, key, projection);
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
            "ExclusiveStartKey",
            "ExpressionAttributeNames",
            "ExpressionAttributeValues",
            "ScanIndexForward",
            "Limit"]);

        if (projection && projection.length > 0) {
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
        addIfExists(params, myParams, ["FilterExpression",
            "ExpressionAttributeNames",
            "ExpressionAttributeValues",
            "Limit",
            "ExclusiveStartKey",
            "IndexName"]);
        if (projection && projection.length > 0) {
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

    delete(TableName: string, Key: DynamoDB.DocumentClient.Key | DynamoDB.DocumentClient.Key[]): Promise<void> {
        if (Array.isArray(Key)) {
            return this.batchWrites(TableName, createDeleteBatchWriteRequests(Key)).then(r => {});
        }
        return this.db.delete({
            TableName,
            Key
        }).promise().then(r => { });
    }

    private batchWrites(TableName: string, writeRequests: DynamoDB.DocumentClient.WriteRequest[], props: PutAllServiceProps = {}): Promise<DynamoDB.DocumentClient.WriteRequest[]> {
        // Dynamo only allows 25 write requests at a time, so we're going to do this 25 at a time.
        const promises: Promise<DynamoDB.DocumentClient.BatchWriteItemRequestMap>[] = [];
        const attempts = props.attempts || MAX_PUT_ALL_ATTEMPTS;
        for (let i = 0; i < writeRequests.length; i += 25) {
            const sliced = writeRequests.slice(i, i + 25);
            promises.push(this.batchWriteUntilCompleteOrRunout({
                RequestItems: {
                    [TableName]: sliced
                }
            }, attempts));
        }

        return Promise.all(promises).then((unprocessedItems) => {
            const unprocessedRequests: DynamoDB.DocumentClient.WriteRequest[] = [];
            for (let unprocessed of unprocessedItems) {
                const keys = Object.keys(unprocessed);
                if (keys.length > 0) {
                    unprocessedRequests.push(...unprocessed[TableName]);
                }
            }
            return unprocessedRequests;
        });
    }

    /**
     * This will loop and process all batch write items until they have all been written or until the attempt count has been hit.
     * @param input The writes to attempt.
     * @param attempts The number of times to attempt writes. Default 5.
     */
    private async batchWriteUntilCompleteOrRunout(input: DynamoDB.DocumentClient.BatchWriteItemInput, attempts: number = 15): Promise<DynamoDB.DocumentClient.BatchWriteItemRequestMap> {
        let count = 0;
        let unprocessed: DynamoDB.DocumentClient.BatchWriteItemRequestMap;
        let writeInput: DynamoDB.DocumentClient.BatchWriteItemInput = input;
        do {
            const timeToSleep = exponentialTime()(count);
            await sleep(timeToSleep);
            const result = await this.db.batchWrite(writeInput).promise();
            writeInput.RequestItems = result.UnprocessedItems;
            unprocessed = result.UnprocessedItems;
        } while (++count < attempts && Object.keys(writeInput.RequestItems).length > 0);
        return unprocessed;
    }


}

function interceptObj<T>(interceptors: Interceptor<T>[], obj: T): T;
function interceptObj<T>(interceptors: Interceptor<T>[], obj: T | T[]): T[];
function interceptObj<T>(interceptors: Interceptor<T>[], obj: T | T[]): T | T[] {
    return Array.isArray(obj) ? obj.map(o => intercept(interceptors, o)) : intercept(interceptors, obj);
}

function intercept<T>(interceptors: Interceptor<T>[], obj: T): T {
    let returnObj: T = obj;
    for (const interceptor of interceptors) {
        returnObj = interceptor(returnObj);
    }
    if (returnObj === undefined) {
        throw new Error("Interceptors must return an object.");
    }
    return returnObj;
}

function createPutBatchWriteRequests(objs: DynamoDB.DocumentClient.PutItemInputAttributeMap | DynamoDB.DocumentClient.PutItemInputAttributeMap[]): DynamoDB.DocumentClient.WriteRequest[] {
    if (Array.isArray(objs)) {
        return objs.map((Item) => {
            return {
                PutRequest: {
                    Item
                }
            };
        });
    } else {
        return [{
            PutRequest: {
                Item: objs
            }
        }];
    }
}

function createDeleteBatchWriteRequests(Keys: DynamoDB.DocumentClient.Key | DynamoDB.DocumentClient.Key[]): DynamoDB.DocumentClient.WriteRequest[] {
    if (Array.isArray(Keys)) {
        return Keys.map((Key) => {
            return {
                DeleteRequest: {
                    Key
                }
            };
        });
    } else {
        return [{
            DeleteRequest: {
                Key: Keys
            }
        }];
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
        throw new ValidationError("Could not construct DynamoService.  Bad input.");
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
                const alias = "#__dynoservice_" + randomString();
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
                const alias = "#__dynoservice_append_" + randomString();
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
            const alias = "#__dynoservice_" + randomString();
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
            if (value !== undefined && value !== null) {
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
            if (newV !== undefined && newV !== null) {
                last.push(newV);
            }
            return last;
        }, []);
    } else if (v !== undefined && v !== null && typeof v === "object") {
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
