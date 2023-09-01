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

import { NativeAttributeValue } from "@aws-sdk/util-dynamodb";
import { DynamoQuery, withCondition } from "../../dynamo-query-builder/DynamoQueryBuilder";
import { ConditionExpression,
         DynamoService,
         MAX_PUT_ALL_ATTEMPTS,
         QueryCountParams,
         QueryCountResult,
         QueryParams,
         QueryResult,
         ScanParams,
         ScanResult,
         UpdateBody,
         UpdateReturnAllType,
         UpdateReturnNoneType,
         UpdateReturnType,
         UpdateReturnUpdatedType} from "../DynamoService";
import { DynamoSchema, KeySchema, TableSchema } from "../KeySchema";
import { ValidationError } from "../ValidationError";
import { TableSchemaBuilder, TableSchemaBuilderProps } from "./SchemaBuilder/TableSchemaBuilder";

export {
    DynamoService,
    ConditionExpression,
    KeySchema,
    QueryParams,
    QueryResult,
    ScanParams,
    ScanResult,
    TableSchema,
    UpdateBody,
    UpdateReturnAllType,
    UpdateReturnNoneType,
    UpdateReturnUpdatedType,
    UpdateReturnType,
    ValidationError };

/**
 * Regexp that can be used for "ignoreColumnsInGet" or similar to detect
 * AWS specific dynamodb columns.  These columns are put by
 * AWS for their use for example in Global Tables.
 */
export const AWS_COLUMN_REGEX = /^aws:.+/;

export interface TableServiceProps extends TableSchemaBuilderProps {
}

export interface PutAllReturn<T> {
    processed: T[];
    unprocessed: T[];
}

export interface DynamoObject {
    [key: string]: NativeAttributeValue;
}

export class TableService<T extends DynamoObject> {
    readonly tableName: string;
    readonly tableSchema: TableSchema<T>;

    private readonly schemaBuilder: TableSchemaBuilder<T>;

    private readonly primaryKey: keyof T;
    private readonly sortKey: keyof T;
    private readonly knownKeys: (keyof T)[] = [];

    private readonly db: DynamoService;

    constructor(tableName: string, db: DynamoService, tableSchema: TableSchema<T>, props: TableServiceProps = {}) {
        this.tableName = tableName;
        this.db = db;
        this.tableSchema = tableSchema;

        this.schemaBuilder = new TableSchemaBuilder(tableSchema, { ...props });

        // Sort out and validate the key schema
        let primaryKeys: (keyof T)[] = [];
        let sortKeys: (keyof T)[] = [];
        for (let key in tableSchema) {
            const v = tableSchema[key];
            // If the schema can't be primary or sort, then it won't have those attributes or the user will get a nasty error.
            if ((v as DynamoSchema).primary) {
                primaryKeys.push(key as keyof T);
            }
            if ((v as DynamoSchema).sort) {
                sortKeys.push(key as keyof T);
            }

            this.knownKeys.push(key);
        }

        this.primaryKey = primaryKeys[0];
        this.sortKey = sortKeys[0];
    }

    /**
     * Inserts an item in to the database.
     *
     * This adds a condition for the primary and (if available) the sort key. It ensures
     * uniqueness and fast-fail and ensures that the item will not be overwritten with a new
     * put.
     *
     * `overrideCondition` can be used to override this condition with a custom one
     * or to remove the condition entirely.
     *
     * If `overrideCondition` is not included, then it will be AND'd with the
     * key checks.
     *
     * @param {T} obj
     * @param {ConditionExpression} [condition]
     * @param {boolean} [overrideCondition]
     * @returns {Promise<T>}
     * @memberof TableService
     */
    put(obj: T, condition?: ConditionExpression, overrideCondition?: boolean): Promise<T> {
        const putObj = this.validateAndConvertObjectToPutObject(obj);
        const primaryExistsQuery = (this.sortKey) ?
            withCondition(this.primaryKey).doesNotExist.and(this.sortKey).doesNotExist :
            withCondition(this.primaryKey).doesNotExist;
        const useCondition: ConditionExpression = overrideCondition ?
            condition :
            primaryExistsQuery.and(condition as DynamoQuery).query();
        return this.db.put(this.tableName, putObj, useCondition)
            .then(() => this.convertObjectsReturnedFromDynamo(putObj));
    }

    /**
     * Inserts a batch of items using DynamoDB's batchWrite process.
     *
     * *BatchWrite does not support conditional expressions*.  As such, if you need to use
     * conditions, you must use `put` and insert each item individually.
     *
     * @param {T[]} obj
     * @returns {Promise<PutAllReturn<T>>}
     * @memberof TableService
     */
    putAll(obj: T[]): Promise<PutAllReturn<T>> {
        const putObjs: T[] = obj.map((o) => this.validateAndConvertObjectToPutObject(o));
        return this.db.put(this.tableName, putObjs, { attempts: MAX_PUT_ALL_ATTEMPTS })
        .then((unprocessed) => ({
            unprocessed: unprocessed,
            processed: putObjs.filter((po): boolean =>
                !unprocessed.find(
                    up => up[this.primaryKey] === po[this.primaryKey] &&
                          up[this.sortKey] === po[this.sortKey]))
        })).then((result) => ({
            unprocessed: this.convertObjectsReturnedFromDynamo(result.unprocessed),
            processed: this.convertObjectsReturnedFromDynamo(result.processed)
        }));
    }

    update(key: Partial<T>, obj: UpdateBody<T>): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: UpdateReturnNoneType): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: UpdateReturnNoneType): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: UpdateReturnUpdatedType): Promise<Partial<T>>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: UpdateReturnUpdatedType): Promise<Partial<T>>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: UpdateReturnAllType): Promise<T>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: UpdateReturnType): Promise<void> | Promise<Partial<T>> | Promise<T>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: UpdateReturnAllType): Promise<T>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: UpdateReturnType): Promise<void> | Promise<Partial<T>> | Promise<T>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression?: ConditionExpression | UpdateReturnType, returnType?: UpdateReturnType): Promise<void> | Promise<T> | Promise<Partial<T>> {
        const convertedUpdateObj = this.validateAndConvertObjectToUpdateObject(obj);
        const dynamoKey = this.getKey(key);
        return this.db
            .update<T>(this.tableName, dynamoKey, convertedUpdateObj, conditionExpression as ConditionExpression, returnType as UpdateReturnAllType)
            .then((results) => (results) ? this.convertObjectsReturnedFromDynamo(results) : undefined) as Promise<T>;
    }

    get<P extends keyof T>(key: Partial<T>): Promise<T>;
    get<P extends keyof T>(key: Partial<T>[]): Promise<T[]>;
    get<P extends keyof T>(key: Partial<T>, projection: P | P[]): Promise<Pick<T, P>>;
    get<P extends keyof T>(key: Partial<T>[], projection: P | P[]): Promise<Pick<T, P>[]>;
    get<P extends keyof T>(key: Partial<T>, projection: string | string[]): Promise<Partial<T>>;
    get<P extends keyof T>(key: Partial<T>[], projection: string | string[]): Promise<Partial<T>[]>;
    get<P extends keyof T>(key: Partial<T> | Partial<T>[], projection?: P | P[] | string | string[]): Promise<Pick<T, P>> | Promise<T> | Promise<Partial<T>> | Promise<Partial<T>[]> | Promise<Pick<T, P>[]> | Promise<T[]>  {
        const realKey = (Array.isArray(key)) ? key.map(key => this.getKey(key)) : this.getKey(key);
        const realProjection: P[] = (projection || this.knownKeys) as P[];
        return this.db.get<T, P>(this.tableName, realKey, realProjection)
            .then(item =>  this.convertObjectsReturnedFromDynamo(item)) as Promise<T>;
    }

    query(params: QueryParams): Promise<QueryResult<T>>;
    query<P extends keyof T>(params: QueryParams, projection: P | P[]): Promise<QueryResult<Pick<T, P>>>;
    query(params: QueryParams, projection: string): Promise<QueryResult<Partial<T>>>;
    query(params: QueryParams, projection: string[]): Promise<QueryResult<Partial<T>>>;
    query<P extends keyof T>(params: QueryParams, projection?: P | P[]) {
        const realProjection: P[] = (projection || this.knownKeys) as P[];
        return this.db.query<T, P>(this.tableName, params, realProjection)
            .then(items => ({ ...items, Items: this.convertObjectsReturnedFromDynamo(items.Items) }));
    }

    count(params: QueryCountParams): Promise<QueryCountResult> {
        return this.db.count(this.tableName, params);
    }

    scan(params: ScanParams): Promise<ScanResult<T>>;
    scan<P extends keyof T>(params: ScanParams, projection: P | P[]): Promise<ScanResult<Pick<T, P>>>;
    scan(params: ScanParams, projection: string | string[]): Promise<ScanResult<Partial<T>>>;
    scan<P extends keyof T>(params: ScanParams, projection?: P | P[] | string | string[]) {
        const realProjection: P[] = (projection || this.knownKeys) as P[];
        return this.db.scan<T, P>(this.tableName, params, realProjection)
            .then(items => ({ ...items, Items: this.convertObjectsReturnedFromDynamo(items.Items) }));
    }

    delete(key: Partial<T> | Partial<T>[]): Promise<void> {
        const dynamoKey = Array.isArray(key) ? key.map(k => this.getKey(k)) : this.getKey(key);
        return this.db.delete(this.tableName, dynamoKey);
    }

    private convertObjectsReturnedFromDynamo<Old, New = Old>(objs: Old): New;
    private convertObjectsReturnedFromDynamo<Old, New = Old>(objs: Old[]): New[];
    private convertObjectsReturnedFromDynamo<Old, New = Old>(objs: Old | Old[]): New | New[] {
        if (objs) {
            if (Array.isArray(objs)) {
                return objs.map((o) => this.schemaBuilder.convertObjectFromSchema(o));
            }
            return this.schemaBuilder.convertObjectFromSchema(objs);
        }
    }

    private getKey(obj: Partial<T>): Partial<T> {
        const key: Partial<T> = {};
        key[this.primaryKey] = obj[this.primaryKey];
        if (this.sortKey) {
            key[this.sortKey] = obj[this.sortKey];
        }
        // Don't convert to schema fully.  If we're updating an object outside the realm, then assume that the user
        // knows that the object exists.
        // Reasoning: If the schema was updated after the item was inserted, then updating to the schema will break it and make it impossible
        // to retrieve or update.
        // Update this if it's needed in the future but 99% of the time the conversion won't be necessary.
        return this.schemaBuilder.convertObjectFromJavascript(key);
    }

    private validateAndConvertObjectToPutObject(obj: T) {
        const newObj = this.schemaBuilder.convertObjectToSchema(obj);
        const errors = this.schemaBuilder.validateObjectAgainstSchema(newObj);
        if (errors && errors.length > 0) {
            throw new ValidationError(errors);
        }
        return newObj;
    }

    private validateAndConvertObjectToUpdateObject(obj: UpdateBody<T>) {
        const convertedUpdateObj = this.schemaBuilder.convertUpdateObjectToSchema(obj);
        const errors = this.schemaBuilder.validateUpdateObjectAgainstSchema(convertedUpdateObj);
        if (errors && errors.length > 0) {
            throw new ValidationError(errors);
        }
        return convertedUpdateObj;
    }
}
