/**
 * Copyright 2019 XAPPmedia
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { DynamoDB } from "aws-sdk";

import { exponentialTime } from "../utils/Backoff";
import { sleep } from "../utils/Sleep";

import { objHasAttrs } from "../utils/Object";
import { UpdateReturnType } from "./TableService";

export const MAX_PUT_ALL_ATTEMPTS = 15;

export type ConstructorDB = DynamoDB | DynamoDB.DocumentClient;

export interface QueryResult<T> {
    Items: T[];
    LastEvaluatedKey?: DynamoDB.DocumentClient.Key;
}

export interface QueryCountResult {
    Count: number;
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

export type QueryCountParams = Pick<QueryParams, "KeyConditionExpression" | "FilterExpression" | "ExpressionAttributeNames" | "ExpressionAttributeValues" | "IndexName">;

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

/**
 * A Set object is used in an update action to replace the elements in a table.
 *
 * Note on nested elements:
 * Nested elements and be totally replaced or only have their specific attributes replaced.
 * To replace only specific attributes, the "set" object should have it's keys specify the attribute.
 *
 * For example:
 *
 * Original object value:
 *
 * {
 *    nestedObj: {
 *       nestedAttribute1: "First"
 *       nestedAttribute2: "Second"
 *       nestedAttribute3: "Third"
 *    }
 * }
 *
 * To replace the entirety of the nested attribute, do this:
 *
 * {
 *    set: {
 *       nestedObj: {
 *          nestedAttribute1: "NewValue"
 *       }
 *    }
 * }
 *
 * When the object is returned, The new value will be:
 *
 * {
 *    nestedObj: {
 *       nestedAttribute1: "NewValue"
 *    }
 * }
 *
 * To replace only specific attributes in the nested object, do this:
 *
 * {
 *    set: {
 *       "nestedObj.nestedAttribute1": "NewValue"
 *    }
 * }
 *
 * When the object is returned, the new value will be:
 *
 * {
 *    nestedObj: {
 *       nestedAttribute1: "NewValue"
 *       nestedAttribute2: "Second"
 *       nestedAttribute3: "Third"
 *    }
 * }
 */
export type Set<T> = Partial<T> | { [key: string]: DynamoDB.DocumentClient.AttributeValue };
/**
 * Object to remove specific attributes from a row.
 *
 * Not on nested elements:
 *
 * To remove specific elements from a nested object, specify the attribute exlicitly like so:
 *
 * {
 *   remove: [
 *     "nestedObj1", // Will remove the entire object "nestedObj1"
 *     "nestedObj2.nestedAttribute" // Will remove the attribute "nestedAttribute" from "nestedObj2"
 *   ]
 * }
 *
 */
export type Remove<T> = (keyof T)[];
/**
 * Appends elements to the end of an List object.
 */
export type Append<T> = Partial<T>;
/**
 * Prepends elements to the beginnign of a List object.
 */
export type Prepend<T> = Partial<T>;

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
     * Add a collection of items to the end of an array.
     *
     * In the format:
     *
     * {
     *    [databaseColumnId]: value[]
     * }
     */
    append?: Append<T>;
    /**
     * Add a collection of items to the beginning of an array.
     *
     * In the format:
     *
     * {
     *    [databaseColumnId]: value[]
     * }
     */
    prepend?: Append<T>;
}

/**
 * The type of return that an update action should return if the caller wants the entire object.
 *
 * ALL_NEW - The newly updated object is returned.
 * ALL_OLD - The pre-updated object is returned.
 */
export type UpdateReturnAllType = "ALL_OLD" | "ALL_NEW";

/**
 * The type of return that an update action should return if the caller only wants the attributes
 * that were updated.
 *
 * UPDATED_OLD - only the attributes which were updated are returned. The values will be pre-updated values.
 * UPDATED_NEW - only the attributed which were updated are returned.  The values will be the updated values.
 */
export type UpdateReturnUpdatedType = "UPDATED_OLD" | "UPDATED_NEW";

/**
 * The type of return that an update action should return if the caller doesn't want anything.
 *
 * NONE - Don't return anything.
 */
export type UpdateReturnNoneType = "NONE";

/**
 * The type of return that an update action should return.
 */
export type UpdateReturnType = UpdateReturnAllType | UpdateReturnUpdatedType | UpdateReturnNoneType;

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
    private readonly updateInterceptors: Interceptor<UpdateBody<any>>[];

    constructor(db: ConstructorDB) {
        this.db = getDb(db);
        this.putInterceptors = [];
        this.updateInterceptors = [];
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
            throw new Error("Put interceptor can not be undefined.");
        }
        this.putInterceptors.push(interceptor);
    }

    /**
     * This adds an interceptor for Update operations.  The object passed to the interceptor is the
     * Update object that is going to the dynamo server.
     *
     * The order in which these are inserted will be the order in which the interceptors will be executed.
     *
     * @template T
     * @param {Interceptor<UpdateBody<T>} interceptor
     * @memberof DynamoService
     */
    addUpdateInterceptor<T>(interceptor: Interceptor<UpdateBody<T>>) {
        if (!interceptor) {
            throw new Error("Update interceptor can not be undefined.");
        }
        this.updateInterceptors.push(interceptor);
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
            }) as Promise<DynamoDB.DocumentClient.PutItemInputAttributeMap[]>;
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
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: UpdateReturnNoneType): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, condition: ConditionExpression, returns: UpdateReturnNoneType): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: UpdateReturnUpdatedType): Promise<Partial<T>>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, condition: ConditionExpression, returns: UpdateReturnUpdatedType): Promise<Partial<T>>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: UpdateReturnAllType): Promise<T>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, condition: ConditionExpression, returns: UpdateReturnAllType): Promise<T>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, conditionOrReturns: ConditionExpression | UpdateReturnType = {}, returns: UpdateReturnType = "NONE") {

        let newUpdate = interceptObj(this.updateInterceptors, update);
        newUpdate = transferUndefinedToRemove(newUpdate);
        newUpdate.set = removeUndefinedAndBlanks(newUpdate.set);

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
            if (conditionExpression.ConditionExpression) {
                params.ConditionExpression = conditionExpression.ConditionExpression;
            }
            if (conditionExpression.ExpressionAttributeNames) {
                params.ExpressionAttributeNames = { ...params.ExpressionAttributeNames, ...conditionExpression.ExpressionAttributeNames };
            }
            if (conditionExpression.ExpressionAttributeValues) {
                params.ExpressionAttributeValues = { ...params.ExpressionAttributeValues, ...conditionExpression.ExpressionAttributeValues };
            }
        }

        return this.db.update(params).promise().then((item) => { return item.Attributes as T; }) as Promise<T>;
    }

    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key): Promise<T>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key[]): Promise<T[]>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key, projection: P): Promise<Pick<T, P>>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key, projection: P[]): Promise<Pick<T, P>>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key[], projection: P): Promise<Pick<T, P>[]>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key[], projection: P[]): Promise<Pick<T, P>[]>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key, projection: string): Promise<Partial<T>>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key, projection: string[]): Promise<Partial<T>>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key[], projection: string): Promise<Partial<T>[]>;
    get<T, P extends keyof T>(table: string, key: DynamoDB.DocumentClient.Key[], projection: string[]): Promise<Partial<T>[]>;
    get<T, P extends keyof T>(tableName: string, Key: DynamoDB.DocumentClient.Key | DynamoDB.DocumentClient.Key[], projection?: P | P[] | string | string[]) {
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
            return this.db.batchGet(items).promise().then((data) => data.Responses[tableName]) as Promise<T[]>;
        }

        const params: DynamoDB.GetItemInput = {
            TableName: tableName,
            Key,
            ...getProjectionExpression(projection)
        };
        return this.db.get(params).promise().then((item) => item.Item) as Promise<T>;
    }

    getAll<T>(tableName: string, key: DynamoDB.DocumentClient.Key[]): Promise<T[]>;
    getAll<T, P extends keyof T>(tableName: string, key: DynamoDB.DocumentClient.Key[], projection: P): Promise<Pick<T, P>[]>;
    getAll<T, P extends keyof T>(tableName: string, key: DynamoDB.DocumentClient.Key[], projection: P[]): Promise<Pick<T, P>[]>;
    getAll<T>(tableName: string, key: DynamoDB.DocumentClient.Key[], projection: string): Promise<Partial<T>[]>;
    getAll<T>(tableName: string, key: DynamoDB.DocumentClient.Key[], projection: string[]): Promise<Partial<T>[]>;
    getAll<T, P extends keyof T>(tableName: string, key: DynamoDB.DocumentClient.Key[], projection?: P | P[] | string | string[]) {
        return this.get(tableName, key, projection as P);
    }

    query<T, P extends keyof T>(table: string, myParams: QueryParams): Promise<QueryResult<T>>;
    query<T, P extends keyof T>(table: string, myParams: QueryParams, projection: P): Promise<QueryResult<Pick<T, P>>>;
    query<T, P extends keyof T>(table: string, myParams: QueryParams, projection: P[]): Promise<QueryResult<Pick<T, P>>>;
    query<T>(table: string, myParams: QueryParams, projection: string): Promise<QueryResult<Partial<T>>>;
    query<T>(table: string, myParams: QueryParams, projection: string[]): Promise<QueryResult<Partial<T>>>;
    query<T, P extends keyof T>(table: string, myParams: QueryParams, projection?: P | P[] | string | string[]) {
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

    count(table: string, myParams: QueryCountParams): Promise<QueryCountResult> {
        const params: DynamoDB.QueryInput = {
            TableName: table,
            Select: "COUNT"
        };
        addIfExists(params, myParams, [
            "KeyConditionExpression",
            "FilterExpression",
            "ExpressionAttributeNames",
            "ExpressionAttributeValues",
            "IndexName"
        ]);
        return this.db.query(params).promise() as Promise<QueryCountResult>;
    }

    scan<T>(table: string, myParams: ScanParams): Promise<ScanResult<T>>;
    scan<T, P extends keyof T>(table: string, myParams: ScanParams, projection: P): Promise<ScanResult<Pick<T, P>>>;
    scan<T, P extends keyof T>(table: string, myParams: ScanParams, projection: P[]): Promise<ScanResult<Pick<T, P>>>;
    scan<T>(table: string, myParams: ScanParams, projection: string): Promise<ScanResult<Partial<T>>>;
    scan<T>(table: string, myParams: ScanParams, projection: string[]): Promise<ScanResult<Partial<T>>>;
    scan<T, P extends keyof T>(table: string, myParams: ScanParams, projection?: P | P[] | string | string[]) {
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
        return this.db.scan(params).promise().then((item)  => ({
            Items: item.Items as T[],
            LastEvaluatedKey: item.LastEvaluatedKey
        }));
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
    } else {
        return db;
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
    const { set, append, remove, prepend } = body;
    if (objHasAttrs(set)) {
        setValues = {};
        setAliasMap = {};
        setExpression = "set ";
        let index = 0;
        for (const key in set) {
            if (set.hasOwnProperty(key)) {
                const splitKeys = key.split(".");
                const aliases: string[] = [];
                for (const splitKey of splitKeys) {
                    const matchKey = splitKey.match(/^([^[\]]+)(\[[0-9]+\])?$/);
                    const alias = "#__dynoservice_updateset_a" + ++index + (matchKey[2] || "");
                    setAliasMap[alias] = matchKey[1];
                    aliases.push(alias);
                }
                const name = ":__dynoservice_updateset_a" + ++index;
                setExpression += aliases.join(".") + " = " + name + ",";
                setValues[name] = set[key as keyof T];
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
                const alias = "#__dynoservice_updateappend_c" + index;
                const name = ":__dynoservice_updateappend_c" + ++index;
                setExpression += alias + " = list_append(if_not_exists(" + alias + ", :__dynoservice_update_append_empty_list)," + name + "),";
                setValues[name] = append[key];
                setValues[":__dynoservice_update_append_empty_list"] = [];
                setAliasMap[alias] = key;
            }
        }
    }

    if (objHasAttrs(prepend)) {
        setValues = setValues || {};
        setAliasMap = setAliasMap || {};
        setExpression = setExpression || "set ";
        let index = 0;
        for (const key in prepend) {
            if (prepend.hasOwnProperty(key)) {
                const alias = "#__dynoservice_prepend_c" + index;
                const name = ":__dynoservice_prepend_c" + ++index;
                setExpression += alias + " = list_append(" + name + ", if_not_exists(" + alias + ", :__dynoservice_update_prepend_empty_list)),";
                setValues[name] = prepend[key];
                setValues[":__dynoservice_update_prepend_empty_list"] = [];
                setAliasMap[alias] = key;
            }
        }
    }

    if (remove && remove.length > 0) {
        setValues = setValues || {};
        setAliasMap = setAliasMap || {};
        setExpression = setExpression ? setExpression.substr(0, setExpression.length - 1) + " remove " : "remove ";
        remove.forEach((key: string, index) => {
            const alias = "#__dynoservice_updateremove_r" + index;
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
        // If there are any arrays listed, then we need to remove them here.
        const ExpressionAttributeNames = Object.keys(setAliasMap).reduce((last, currentKey) => {
            last[currentKey.replace(/\[[0-9]+\]$/, "")] = setAliasMap[currentKey];
            return last;
        }, {} as DynamoDB.DocumentClient.AttributeMap);
        returnValue = { ...returnValue, ...{ ExpressionAttributeNames } };
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
        return { };
    }

    const expression = [].concat(projectionExpression);
    const lastExpressionIndex = expression.length - 1;
    let ProjectionExpression: string = "";
    let ExpressionAttributeNames: any = {};
    let keyCount = 0;

    expression.forEach((value: string, index: number) => {
        const splitValues = value.split(".");
        const lastSplitValueIndex = splitValues.length - 1;

        splitValues.forEach((split, splitIndex) => {
            const middleOfSplit = splitIndex < lastSplitValueIndex;

            // If we're the last element of a split, then it's possible it's an array projection (i.e. Nested.Param[3])
            const name = (middleOfSplit) ?
                split :
                split.replace(/\[\d\]$/, "");

            const key = "#__dynoservice_proj" + keyCount++;
            ExpressionAttributeNames[key] = name;
            ProjectionExpression += key;
            if (middleOfSplit) {
                ProjectionExpression += ".";
            }
            if (name.length < split.length) {
                // Append the array portion to the end of the split.
                ProjectionExpression += split.slice(name.length);
            }
        });
        if (index < lastExpressionIndex) {
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
