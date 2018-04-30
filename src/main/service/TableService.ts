import { ConditionExpression, DynamoService, QueryParams, QueryResult, ScanParams, ScanResult, UpdateBody, UpdateReturnType } from "./DynamoService";

import { DynamoQuery, withCondition } from "../dynamo-query-builder/DynamoQueryBuilder";
import { subset, throwIfDoesContain, throwIfDoesNotContain } from "../utils/Object";
import { Converter } from "./Converters";
import { toIso, toTimestamp } from "./Converters";

import { KeySchema, TableSchema } from "./KeySchema";

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
    UpdateReturnType };

export interface TableServiceProps {
    /**
     * If true, then keys will be removed from an object if they are put or set but not defined
     * in the table schema. By default, this is false which means they will be added as is without
     * modification.
     */
    trimUnknown?: boolean;
}

export interface PutAllReturn<T> {
    unprocessed: T[];
}

interface KeyConverter<T> {
    key: keyof T;
    converter: Converter<any, any>;
}

function getConverter(schema: KeySchema): Converter<any, any> {
    if (schema.type === "Date") {
        return schema.dateFormat === "Timestamp" ? toTimestamp : toIso;
    }
}

export class TableService<T extends object> {
    readonly tableName: string;
    readonly tableSchema: TableSchema;

    private readonly primaryKey: keyof T;
    private readonly sortKey: keyof T;
    private readonly requiredKeys: (keyof T)[] = [];
    private readonly constantKeys: (keyof T)[] = [];
    private readonly knownKeys: (keyof T)[] = [];

    private readonly keyConverters: KeyConverter<T>[] = [];

    private readonly db: DynamoService;
    private readonly props: TableServiceProps;

    constructor(tableName: string, db: DynamoService, tableSchema: TableSchema, props: TableServiceProps = {}) {
        this.tableName = tableName;
        this.db = db;
        this.tableSchema = tableSchema;
        this.props = props;

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
            if (v.required) {
                this.requiredKeys.push(key as keyof T);
            }
            if (v.constant) {
                this.constantKeys.push(key as keyof T);
            }
            this.knownKeys.push(key as keyof T);

            const converter = getConverter(v);
            if (converter) {
                this.keyConverters.push({
                    key: key as keyof T,
                    converter
                });
            }
        }
        if (primaryKeys.length === 0) {
            throw new Error("Table " + tableName + " must include a primary key.");
        }
        if (primaryKeys.length > 1) {
            throw new Error("Table " + tableName + " must only have one primary key.");
        }
        if (sortKeys.length > 1) {
            throw new Error("Table " + tableName + " can not have more than one sort key.");
        }

        this.primaryKey = primaryKeys[0];
        this.sortKey = sortKeys[0];
    }

    put(obj: T, condition?: ConditionExpression): Promise<T> {
        ensureHasRequiredKeys(this.requiredKeys, obj);
        const putObj: T = (this.props.trimUnknown) ? subset(obj, this.knownKeys) as T : obj;
        const primaryExistsQuery = (this.sortKey) ?
            withCondition(this.primaryKey).doesNotExist.and(this.sortKey).doesNotExist :
            withCondition(this.primaryKey).doesNotExist;

        const converted = this.convertObjToDynamo(putObj);
        return this.db.put(this.tableName, converted, primaryExistsQuery.and(condition as DynamoQuery).query())
                .then((res) => { return putObj; });
    }

    putAll(obj: T[]): Promise<PutAllReturn<T>> {
        obj.forEach(o => ensureHasRequiredKeys(this.requiredKeys, o));
        const putObjs: T[] = (this.props.trimUnknown) ?
            obj.map(o => subset(o, this.knownKeys) as T) :
            obj;
        const converted: T[] = putObjs.map(p => this.convertObjToDynamo(p));
        return this.db.put(this.tableName, converted).then(unprocessed => {
            return {
                unprocessed: unprocessed as T[]
            };
        });
    }

    update(key: Partial<T>, obj: UpdateBody<T>): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: "NONE"): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: "NONE"): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: "UPDATED_OLD" | "UPDATED_NEW"): Promise<Partial<T>>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: "UPDATED_OLD" | "UPDATED_NEW"): Promise<Partial<T>>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: "ALL_OLD" | "ALL_NEW"): Promise<T>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression: ConditionExpression, returnType: "ALL_OLD" | "ALL_NEW"): Promise<T>;
    update(key: Partial<T>, obj: UpdateBody<T>, returnType: string): Promise<void>;
    update(key: Partial<T>, obj: UpdateBody<T>, conditionExpression?: ConditionExpression | UpdateReturnType | string, returnType?: UpdateReturnType | string): Promise<void> | Promise<T> | Promise<Partial<T>> {
        ensureDoesNotHaveConstantKeys(this.constantKeys.concat(this.requiredKeys), obj.remove);
        ensureDoesNotHaveConstantKeys(this.constantKeys, obj.set);
        ensureDoesNotHaveConstantKeys(this.constantKeys, obj.append);
        return this.db.update<T>(this.tableName, key, obj, conditionExpression as ConditionExpression, returnType);
    }

    get(key: Partial<T>): Promise<T>;
    get(key: Partial<T>[]): Promise<T[]>;
    get<P extends keyof T>(key: Partial<T>, projection: P | P[]): Promise<Pick<T, P>>;
    get<P extends keyof T>(key: Partial<T>[], projection: P | P[]): Promise<Pick<T, P>[]>;
    get<P extends keyof T>(key: Partial<T> | Partial<T>[], projection?: P | P[]): Promise<Pick<T, P>> | Promise<T> | Promise<Pick<T, P>[]> | Promise<T[]>  {
        return this.db.get<T, P>(this.tableName, key, projection).then(item => this.convertObjFromDynamo(item));
    }

    query(params: QueryParams): Promise<QueryResult<T>>;
    query<P extends keyof T>(params: QueryParams, projection: P | P[]): Promise<QueryResult<Pick<T, P>>>;
    query<P extends keyof T>(params: QueryParams, projection?: P | P[]): Promise<QueryResult<T>> | Promise<QueryResult<Pick<T, P>>> {
        return this.db.query<T, P>(this.tableName, params, projection).then(items => this.convertObjectsFromDynamo(items));
    }

    scan(params: ScanParams): Promise<ScanResult<T>>;
    scan<P extends keyof T>(params: ScanParams, projection: P | P[]): Promise<ScanResult<Pick<T, P>>>;
    scan<P extends keyof T>(params: ScanParams, projection?: P | P[]): Promise<ScanResult<T>> | Promise<ScanResult<Pick<T, P>>>  {
        return this.db.scan<T, P>(this.tableName, params, projection).then(items => this.convertObjectsFromDynamo(items));
    }

    delete(key: Partial<T> | Partial<T>[]): Promise<void> {
        return this.db.delete(this.tableName, key);
    }

    private convertObjFromDynamo(dynamoObj: T): T;
    private convertObjFromDynamo<P extends keyof T>(dynamoObj: Pick<T, P>): Pick<T, P>;
    private convertObjFromDynamo<P extends keyof T>(dynamoObj: T | Pick<T, P>): T | Pick<T, P> {
        // This isn't going to copy the original object because dynamo objects come from us, so it doesn't matter if it changes.
        for (let converter of this.keyConverters) {
            if (dynamoObj.hasOwnProperty(converter.key)) {
                (dynamoObj as T)[converter.key] = converter.converter.fromObj((dynamoObj as T)[converter.key]);
            }
        }
        return dynamoObj;
    }

    private convertObjectsFromDynamo(dynamoObj: QueryResult<T>): QueryResult<T>;
    private convertObjectsFromDynamo<P extends keyof T>(dynamoObj: QueryResult<Pick<T, P>>): QueryResult<Pick<T, P>>;
    private convertObjectsFromDynamo<P extends keyof T>(dynamoObj: QueryResult<T> | QueryResult<Pick<T, P>>): QueryResult<T> | QueryResult<Pick<T, P>> {
        // I'm not sure what Typescript's issue is with this, so making an any.
        dynamoObj.Items = (dynamoObj.Items as any[]).map(item => this.convertObjFromDynamo(item));
        return dynamoObj;
    }

    private convertObjToDynamo(obj: T) {
        const copy: T = { ...obj as object } as T;
        for (let converter of this.keyConverters) {
            copy[converter.key] = converter.converter.toObj(obj[converter.key]);
        }
        return copy;
    }
}

function ensureHasRequiredKeys<T>(requiredKeys: (keyof T)[], obj: T) {
    try {
        throwIfDoesNotContain(obj, requiredKeys);
    } catch (e) {
        throw new Error("The the object requires the keys '" + requiredKeys.join(",") + "'.");
    }
}

function ensureDoesNotHaveConstantKeys<T>(constantKeys: (keyof T)[], obj: Partial<T> | (keyof T)[]) {
    try {
        throwIfDoesContain(obj as any, constantKeys);
    } catch (e) {
        throw new Error("The keys '" + constantKeys.join(",") + "' are constant and can not be modified.");
    }
}