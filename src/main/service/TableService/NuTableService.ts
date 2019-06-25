import { DynamoDB } from "aws-sdk";
import { DynamoQuery, withCondition } from "../../dynamo-query-builder/DynamoQueryBuilder";
import { ConditionExpression,
         DynamoService,
         MAX_PUT_ALL_ATTEMPTS,
         QueryParams,
         QueryResult,
         ScanParams,
         ScanResult,
         UpdateBody,
         UpdateReturnAllType,
         UpdateReturnNoneType,
         UpdateReturnType,
         UpdateReturnUpdatedType } from "../DynamoService";
import { KeySchema, TableSchema } from "../KeySchema";
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
    UpdateReturnType };

/**
 * Regexp that can be used for "ignoreColumnsInGet" or similar to detect
 * AWS specific dynamodb columns.  These columns are put by
 * AWS for their use for example in Global Tables.
 */
export const AWS_COLUMN_REGEX = /^aws:.+/;

export interface TableServiceProps extends TableSchemaBuilderProps {
}

export interface PutAllReturn<T> {
    unprocessed: T[];
}

export interface DynamoObject {
    [key: string]: DynamoDB.DocumentClient.AttributeValue;
}

export class NuTableService<T extends DynamoObject> {
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
            if (v.primary) {
                primaryKeys.push(key as keyof T);
            }
            if (v.sort) {
                sortKeys.push(key as keyof T);
            }

            this.knownKeys.push(key);
        }

        this.primaryKey = primaryKeys[0];
        this.sortKey = sortKeys[0];
    }

    put(obj: T, condition?: ConditionExpression): Promise<T> {
        const putObj = this.validateAndConvertObjectToPutObject(obj);
        const primaryExistsQuery = (this.sortKey) ?
            withCondition(this.primaryKey).doesNotExist.and(this.sortKey).doesNotExist :
            withCondition(this.primaryKey).doesNotExist;
        return this.db.put(this.tableName, putObj, primaryExistsQuery.and(condition as DynamoQuery).query())
                .then(() => this.convertObjectsReturnedFromDynamo(putObj));
    }

    putAll(obj: T[]): Promise<PutAllReturn<T>> {
        const putObjs = obj.map((o) => this.validateAndConvertObjectToPutObject(o));
        return this.db.put(this.tableName, putObjs, { attempts: MAX_PUT_ALL_ATTEMPTS })
            .then((unprocessed) => ({
                unprocessed: this.convertObjectsReturnedFromDynamo(unprocessed)
            }));
    }

    update(key: Partial<T>, obj: UpdateBody<T>): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: UpdateReturnNoneType): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: UpdateReturnNoneType): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: UpdateReturnUpdatedType): Promise<Partial<T>>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: UpdateReturnUpdatedType): Promise<Partial<T>>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: UpdateReturnAllType): Promise<T>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: UpdateReturnAllType): Promise<T>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression?: ConditionExpression | UpdateReturnType, returnType?: UpdateReturnType): Promise<void> | Promise<T> | Promise<Partial<T>> {
        const convertedUpdateObj = this.validateAndConvertObjectToUpdateObject(obj);
        const dynamoKey = this.getKey(key);
        return this.db
            .update<T>(this.tableName, dynamoKey, convertedUpdateObj, conditionExpression as ConditionExpression, returnType as UpdateReturnAllType)
            .then((results) => (results) ? this.convertObjectsReturnedFromDynamo(results) : undefined) as Promise<T>;
    }

    get<P extends keyof T>(key: Partial<T>): Promise<T>;
    get<P extends keyof T>(key: Partial<T>[]): Promise<T[]>;
    get<P extends keyof T>(key: Partial<T>, projection: P): Promise<Pick<T, P>>;
    get<P extends keyof T>(key: Partial<T>, projection: P[]): Promise<Pick<T, P>>;
    get<P extends keyof T>(key: Partial<T>[], projection: P): Promise<Pick<T, P>[]>;
    get<P extends keyof T>(key: Partial<T>[], projection: P[]): Promise<Pick<T, P>[]>;
    get<P extends keyof T>(key: Partial<T>, projection: string): Promise<Partial<T>>;
    get<P extends keyof T>(key: Partial<T>, projection: string[]): Promise<Partial<T>>;
    get<P extends keyof T>(key: Partial<T>[], projection: string): Promise<Partial<T>[]>;
    get<P extends keyof T>(key: Partial<T>[], projection: string[]): Promise<Partial<T>[]>;
    get<P extends keyof T>(key: Partial<T> | Partial<T>[], projection?: P | P[] | string | string[]): Promise<Pick<T, P>> | Promise<T> | Promise<Partial<T>> | Promise<Partial<T>[]> | Promise<Pick<T, P>[]> | Promise<T[]>  {
        const realKey = (Array.isArray(key)) ? key.map(key => this.getKey(key)) : this.getKey(key);
        const realProjection: P[] = (projection || this.knownKeys) as P[];
        return this.db.get<T, P>(this.tableName, realKey, realProjection)
            .then(item =>  this.convertObjectsReturnedFromDynamo(item)) as Promise<T>;
    }

    query(params: QueryParams): Promise<QueryResult<T>>;
    query<P extends keyof T>(params: QueryParams, projection: P): Promise<QueryResult<Pick<T, P>>>;
    query<P extends keyof T>(params: QueryParams, projection: P[]): Promise<QueryResult<Pick<T, P>>>;
    query(params: QueryParams, projection: string): Promise<QueryResult<Partial<T>>>;
    query(params: QueryParams, projection: string[]): Promise<QueryResult<Partial<T>>>;
    query<P extends keyof T>(params: QueryParams, projection?: P | P[]) {
        const realProjection: P[] = (projection || this.knownKeys) as P[];
        return this.db.query<T, P>(this.tableName, params, realProjection)
            .then(items => ({ ...items, Items: this.convertObjectsReturnedFromDynamo(items.Items) }));
    }

    scan(params: ScanParams): Promise<ScanResult<T>>;
    scan<P extends keyof T>(params: ScanParams, projection: P): Promise<ScanResult<Pick<T, P>>>;
    scan<P extends keyof T>(params: ScanParams, projection: P[]): Promise<ScanResult<Pick<T, P>>>;
    scan(params: ScanParams, projection: string): Promise<ScanResult<Partial<T>>>;
    scan(params: ScanParams, projection: string[]): Promise<ScanResult<Partial<T>>>;
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
        // Don't convert to schema.  If we're updating an object outside the realm, then assume that the user
        // knows that the object exists.
        // Reasoning: If the schema was updated after the item was inserted, then updating to the schema will break it and make it impossible
        // to retrieve or update.
        // Update this if it's needed in the future but 99% of the time the conversion won't be necessary.
        return key;
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

export class ValidationError extends Error {
    constructor(msg: string[]) {
        super(`Errors: [ ${msg.join("\n")} ]`);
    }
}