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
import { TableSchemaConverter } from "./TableSchemaConverter";
import { TableSchemaValidator } from "./TableSchemaValidator";

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

export interface TableServiceProps {
        /**
     * If true, then keys will be removed from an object if they are put or set but not defined
     * in the table schema. By default, this is false in which case an error will be thrown if they are included.
     */
    trimUnknown?: boolean;
    /**
     * If true, then the keys will be removed that are constant when updating.
     * By default, this is false in which case an error will be thrown if trying to update items that are constant.
     */
    trimConstants?: boolean;
    /**
     * A list or regex of columns with which to ignore when querying items.  This items will be stripped from the
     * returned object if it matches.
     */
    ignoreColumnsInGet?: RegExp | RegExp[];
}

export interface PutAllReturn<T> {
    unprocessed: T[];
}

export class TableService<T extends object> {
    readonly tableName: string;
    readonly tableSchema: TableSchema<T>;

    private readonly props: TableServiceProps;
    private readonly tableValidator: TableSchemaValidator<T>;
    private readonly tableSchemaConverter: TableSchemaConverter<T>;

    private readonly primaryKey: keyof T;
    private readonly sortKey: keyof T;
    private readonly knownKeys: (keyof T)[] = [];

    private readonly db: DynamoService;

    constructor(tableName: string, db: DynamoService, tableSchema: TableSchema<T>, props: TableServiceProps = {}) {
        this.tableName = tableName;
        this.db = db;
        this.tableSchema = tableSchema;
        this.props = props;

        this.tableValidator = new TableSchemaValidator(tableSchema, tableName);
        this.tableSchemaConverter = new TableSchemaConverter(tableSchema, props);

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
                .then((res) => this.convertObjectsReturnedFromDynamo(putObj as T));
    }

    putAll(obj: T[]): Promise<PutAllReturn<T>> {
        const putObjs = obj.map((o) => this.validateAndConvertObjectToPutObject(o));
        return this.db.put(this.tableName, putObjs, { attempts: MAX_PUT_ALL_ATTEMPTS })
            .then((unprocessed) => ({
                unprocessed: unprocessed.map((u) => this.convertObjectsReturnedFromDynamo(u as T))
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
        const convertedUpdateObj = this.tableSchemaConverter.convertUpdateObj(obj, { trimConstants: this.props.trimConstants });
        this.tableValidator.validateUpdateObj(convertedUpdateObj);
        const dynamoKey = this.getKey(key);
        return this.db
            .update<T>(this.tableName, dynamoKey, convertedUpdateObj, conditionExpression as ConditionExpression, returnType as UpdateReturnAllType) // Typescript doesn't know which is which, but if we assume the all type, then we can easily handle everything.
            .then((results) => (results) ? this.convertObjectsReturnedFromDynamo(results) : undefined) as Promise<T>;
    }

    get(key: Partial<T>): Promise<T>;
    get(key: Partial<T>[]): Promise<T[]>;
    get<P extends keyof T>(key: Partial<T>, projection: P | P[]): Promise<Pick<T, P>>;
    get<P extends keyof T>(key: Partial<T>[], projection: P | P[]): Promise<Pick<T, P>[]>;
    get<P extends keyof T>(key: Partial<T> | Partial<T>[], projection?: P | P[]): Promise<Pick<T, P>> | Promise<T> | Promise<Pick<T, P>[]> | Promise<T[]>  {
        const realKey = (Array.isArray(key)) ? key.map(key => this.getKey(key)) : this.getKey(key);
        const realProjection: P | P[] = projection || this.knownKeys as P[];
        return this.db.get<T, P>(this.tableName, realKey, realProjection).then(item => (item) ? this.convertObjectsReturnedFromDynamo(item) : item) as Promise<T>;
    }

    query(params: QueryParams): Promise<QueryResult<T>>;
    query<P extends keyof T>(params: QueryParams, projection: P | P[]): Promise<QueryResult<Pick<T, P>>>;
    query<P extends keyof T>(params: QueryParams, projection?: P | P[]): Promise<QueryResult<T>> | Promise<QueryResult<Pick<T, P>>> {
        const realProjection: P | P[] = projection || this.knownKeys as P[];
        return this.db.query<T, P>(this.tableName, params, realProjection)
            .then(items => ({ ...items, Items: this.convertObjectsReturnedFromDynamo(items.Items) }));
    }

    scan(params: ScanParams): Promise<ScanResult<T>>;
    scan<P extends keyof T>(params: ScanParams, projection: P | P[]): Promise<ScanResult<Pick<T, P>>>;
    scan<P extends keyof T>(params: ScanParams, projection?: P | P[]): Promise<ScanResult<T>> | Promise<ScanResult<Pick<T, P>>>  {
        const realProjection: P | P[] = projection || this.knownKeys as P[];
        return this.db.scan<T, P>(this.tableName, params, realProjection)
            .then(items => ({ ...items, Items: this.convertObjectsReturnedFromDynamo(items.Items) }));
    }

    delete(key: Partial<T> | Partial<T>[]): Promise<void> {
        const dynamoKey = Array.isArray(key) ? key.map(k => this.getKey(k)) : this.getKey(key);
        return this.db.delete(this.tableName, dynamoKey);
    }

    private convertObjectsReturnedFromDynamo(objs: T): T;
    private convertObjectsReturnedFromDynamo<P extends keyof T>(objs: Pick<T, P>): Pick<T, P>;
    private convertObjectsReturnedFromDynamo(objs: T[]): T[];
    private convertObjectsReturnedFromDynamo<P extends keyof T>(objs: Pick<T, P>[]): Pick<T, P>[];
    private convertObjectsReturnedFromDynamo<P extends keyof T>(objs: T | T[] | Pick<T, P> | Pick<T, P>[]): T | T[] | Pick<T, P> | Pick<T, P>[] {
        return this.tableSchemaConverter.convertObjFromDynamo(objs as T[], { trimUnknown: this.props.trimUnknown, ignoreColumnsInGet: this.props.ignoreColumnsInGet });
    }

    private getKey(obj: Partial<T>): Partial<T> {
        const key: Partial<T> = {};
        key[this.primaryKey] = obj[this.primaryKey];
        if (this.sortKey) {
            key[this.sortKey] = obj[this.sortKey];
        }
        return this.tableSchemaConverter.convertObjToDynamo(key);
    }

    private validateAndConvertObjectToPutObject(obj: T) {
        // This is intended to be called in a PUT request.  Do not trim the constant items.
        const newObj = this.tableSchemaConverter.convertObj(obj, { trimUnknown: this.props.trimUnknown });
        this.tableValidator.validate(newObj);
        return this.tableSchemaConverter.convertObjToDynamo(newObj);
    }
}
