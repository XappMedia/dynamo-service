/**
 * Copyright 2023 XAPPmedia
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

import { StringKeys } from "../../types/StringKeys";

export type DynamoDBKey = unknown;

export interface QueryResult<T> {
    Items: T[];
    LastEvaluatedKey?: DynamoDBKey;
}

export interface QueryCountResult {
    Count: number;
}

export interface ScanResult<T> {
    Items: T[];
    LastEvaluatedKey?: DynamoDBKey;
}

export type DynamoDBExpressionAttributeNames = Record<string, string>;
export type DynamoDBExpressionAttributeValues = Record<string, string | number | boolean>;

export interface QueryParams {
    IndexName?: string;
    FilterExpression?: string;
    KeyConditionExpression: string;
    ExpressionAttributeNames?: DynamoDBExpressionAttributeNames;
    ExpressionAttributeValues?: DynamoDBExpressionAttributeValues;
    ScanIndexForward?: boolean;
    Limit?: number;
    ExclusiveStartKey?: DynamoDBKey;
}

export type QueryCountParams = Pick<QueryParams, "KeyConditionExpression" | "FilterExpression" | "ExpressionAttributeNames" | "ExpressionAttributeValues" | "IndexName">;

export type DynamoDBFilterExpression = string;

export type DynamoDBConditionExpression = string;

export interface ScanParams {
    IndexName?: string;
    FilterExpression?: DynamoDBFilterExpression;
    ExpressionAttributeNames?: DynamoDBExpressionAttributeNames;
    ExpressionAttributeValues?: DynamoDBExpressionAttributeValues;
    Limit?: number;
    ExclusiveStartKey?: DynamoDBKey;
}

export interface ConditionExpression {
    ConditionExpression?: DynamoDBConditionExpression;
    ExpressionAttributeNames?: DynamoDBExpressionAttributeNames;
    ExpressionAttributeValues?: DynamoDBExpressionAttributeValues;
}

export type DynamoDBAttributeValue = string | number | boolean | object;

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
export type Set<T> = Partial<T> | { [key: string]: DynamoDBAttributeValue };

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
export type Remove<T> = (StringKeys<T>)[];

/**
 * Appends elements to the end of an List object.
 */
export type Append<T> = Partial<T>;
/**
 * Prepends elements to the beginning of a List object.
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
export interface UpdateParameters {
    UpdateExpression: string;
    ExpressionAttributeNames?: DynamoDBExpressionAttributeNames;
    ExpressionAttributeValues?: DynamoDBExpressionAttributeValues;
}

export type DynamoDBPutItemMap = Record<string, DynamoDBAttributeValue>;

export type DynamoDBAttributeMap = Record<string, DynamoDBAttributeValue>;

export interface DynamoDBPutItemInput extends ConditionExpression {
    TableName: string;
    Item: DynamoDBPutItemMap;
}

export interface DynamoDBPutItemOutput {
    /**
     * The attribute values as they appeared before the PutItem operation, but only if ReturnValues is specified as ALL_OLD in the request. Each element consists of an attribute name and an attribute value.
     */
    Attributes?: DynamoDBAttributeMap;
}

export interface DynamoDBWriteRequest {
    PutRequest?: {
        Item: DynamoDBAttributeMap;
    },
    DeleteRequest?: {
        Key: DynamoDBKey;
    }
}

export type DynamoDBBatchWrites = Record<string, DynamoDBWriteRequest[]>;

export interface DynamoDBBatchWriteInput {
    RequestItems: DynamoDBBatchWrites;
}

export interface DynamoDBBatchWriteOutput {
    UnprocessedItems: DynamoDBBatchWrites;
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

export interface IDynamoService {
    /**
     * This adds an interceptor that can intercept objects being sent to Dynamo db in a PUT* operation.
     *
     * The order in which these are inserted will be the order in which the interceptors will be executed.
     *
     * @template T
     * @param {Interceptor<T>} interceptor
     * @memberof DynamoService
     */
    addPutInterceptor<T>(interceptor: Interceptor<T>): void;

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
    addUpdateInterceptor<T>(interceptor: Interceptor<UpdateBody<T>>): void;

    put(TableName: string, obj: DynamoDBPutItemMap): Promise<DynamoDBPutItemOutput>;
    put(TableName: string, obj: DynamoDBPutItemMap, condition: ConditionExpression): Promise<DynamoDBPutItemOutput>;
    put(TableName: string, obj: DynamoDBPutItemMap[]): Promise<DynamoDBPutItemMap[]>;
    put(TableName: string, obj: DynamoDBPutItemMap[], props: PutAllServiceProps): Promise<DynamoDBPutItemMap[]>;

    update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>): Promise<void>;
    update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, condition: ConditionExpression): Promise<void>;
    update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, returns: UpdateReturnNoneType): Promise<void>;
    update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, condition: ConditionExpression, returns: UpdateReturnNoneType): Promise<void>;
    update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, returns: UpdateReturnUpdatedType): Promise<Partial<T>>;
    update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, condition: ConditionExpression, returns: UpdateReturnUpdatedType): Promise<Partial<T>>;
    update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, returns: UpdateReturnAllType): Promise<T>;
    update<T>(table: string, key: DynamoDBKey, update: UpdateBody<T>, condition: ConditionExpression, returns: UpdateReturnAllType): Promise<T>;

    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey): Promise<T>;
    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey[]): Promise<T[]>;
    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey, projection: P): Promise<Pick<T, P>>;
    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey, projection: P[]): Promise<Pick<T, P>>;
    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey[], projection: P): Promise<Pick<T, P>[]>;
    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey[], projection: P[]): Promise<Pick<T, P>[]>;
    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey, projection: string): Promise<Partial<T>>;
    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey, projection: string[]): Promise<Partial<T>>;
    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey[], projection: string): Promise<Partial<T>[]>;
    get<T, P extends StringKeys<T>>(table: string, key: DynamoDBKey[], projection: string[]): Promise<Partial<T>[]>;

    getAll<T>(tableName: string, key: DynamoDBKey[]): Promise<T[]>;
    getAll<T, P extends StringKeys<T>>(tableName: string, key: DynamoDBKey[], projection: P): Promise<Pick<T, P>[]>;
    getAll<T, P extends StringKeys<T>>(tableName: string, key: DynamoDBKey[], projection: P[]): Promise<Pick<T, P>[]>;
    getAll<T>(tableName: string, key: DynamoDBKey[], projection: string): Promise<Partial<T>[]>;
    getAll<T>(tableName: string, key: DynamoDBKey[], projection: string[]): Promise<Partial<T>[]>;

    query<T, P extends StringKeys<T>>(table: string, myParams: QueryParams): Promise<QueryResult<T>>;
    query<T, P extends StringKeys<T>>(table: string, myParams: QueryParams, projection: P): Promise<QueryResult<Pick<T, P>>>;
    query<T, P extends StringKeys<T>>(table: string, myParams: QueryParams, projection: P[]): Promise<QueryResult<Pick<T, P>>>;
    query<T>(table: string, myParams: QueryParams, projection: string): Promise<QueryResult<Partial<T>>>;
    query<T>(table: string, myParams: QueryParams, projection: string[]): Promise<QueryResult<Partial<T>>>;

    count(table: string, myParams: QueryCountParams): Promise<QueryCountResult>;

    scan<T>(table: string, myParams: ScanParams): Promise<ScanResult<T>>;
    scan<T, P extends StringKeys<T>>(table: string, myParams: ScanParams, projection: P): Promise<ScanResult<Pick<T, P>>>;
    scan<T, P extends StringKeys<T>>(table: string, myParams: ScanParams, projection: P[]): Promise<ScanResult<Pick<T, P>>>;
    scan<T>(table: string, myParams: ScanParams, projection: string): Promise<ScanResult<Partial<T>>>;
    scan<T>(table: string, myParams: ScanParams, projection: string[]): Promise<ScanResult<Partial<T>>>;

    delete(TableName: string, Key: DynamoDBKey | DynamoDBKey[]): Promise<void>;
}
