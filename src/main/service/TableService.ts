import { ConditionExpression, DynamoService, QueryParams, QueryResult, ScanParams, ScanResult, UpdateBody, UpdateReturnType } from "./DynamoService";

import { DynamoQuery, withCondition } from "../dynamo-query-builder/DynamoQueryBuilder";
import { removeItems, subset, throwIfDoesContain, throwIfDoesNotContain } from "../utils/Object";
import { Converter } from "./Converters";
import { toIso, toTimestamp } from "./Converters";

import { DynamoStringSchema, KeySchema, TableSchema } from "./KeySchema";

const slugify = require("slugify");

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
     * in the table schema. By default, this is false in which case an error will be thrown if they are included.
     */
    trimUnknown?: boolean;

    /**
     * If true, then the keys will be removed that are constant when updating.
     * By default, this is false in which case an error will be thrown if trying to update items that are constant.
     */
    trimConstants?: boolean;
}

export interface PutAllReturn<T> {
    unprocessed: T[];
}

interface SlugParams {

}

type KeyConverter<T> = Partial<Record<keyof T, Converter<any, any>>>;
type BannedKeys<T> = Partial<Record<keyof T, RegExp>>;
type EnumKeys<T> = Partial<Record<keyof T, string[]>>;
type SlugKeys<T> = Partial<Record<keyof T, boolean | SlugParams>>;

function getConverter(schema: KeySchema): Converter<any, any> {
    if (schema.type === "Date") {
        return schema.dateFormat === "Timestamp" ? toTimestamp : toIso;
    }
}

function isDynamoStringSchema(v: KeySchema): v is DynamoStringSchema {
    return v.type === "S";
}

export class TableService<T extends object> {
    readonly tableName: string;
    readonly tableSchema: TableSchema;

    private readonly primaryKey: keyof T;
    private readonly sortKey: keyof T;
    private readonly requiredKeys: (keyof T)[] = [];
    private readonly constantKeys: (keyof T)[] = [];
    private readonly knownKeys: (keyof T)[] = [];

    private readonly bannedKeys: BannedKeys<T> = {};
    private readonly keyConverters: KeyConverter<T> = {};
    private readonly enumKeys: EnumKeys<T> = {};
    private readonly slugKeys: SlugKeys<T> = {};

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
                this.constantKeys.push(key as keyof T);
            }
            if (v.sort) {
                sortKeys.push(key as keyof T);
                this.constantKeys.push(key as keyof T);
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
                this.keyConverters[key as keyof T] = converter;
            }

            if (isDynamoStringSchema(v)) {
                if (v.invalidCharacters) {
                    this.bannedKeys[key as keyof T] = new RegExp("[" + v.invalidCharacters + "]");
                }
                if (v.enum) {
                    this.enumKeys[key as keyof T] = v.enum;
                }
                if (v.slugify) {
                    this.slugKeys[key as keyof T] = v.slugify;
                }
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
        ensureNoInvalidCharacters(this.bannedKeys, obj);
        ensureEnums(this.enumKeys, obj);

        let putObj: T = slugifyKeys(this.slugKeys, obj);
        if (this.props.trimUnknown) {
            putObj = subset(putObj, this.knownKeys) as T;
        }

        ensureNoExtraKeys(this.knownKeys, putObj);

        const primaryExistsQuery = (this.sortKey) ?
            withCondition(this.primaryKey).doesNotExist.and(this.sortKey).doesNotExist :
            withCondition(this.primaryKey).doesNotExist;

        const converted = this.convertObjToDynamo(putObj);
        return this.db.put(this.tableName, converted, primaryExistsQuery.and(condition as DynamoQuery).query())
                .then((res) => { return putObj; });
    }

    putAll(obj: T[]): Promise<PutAllReturn<T>> {
        obj.forEach(o => {
            ensureHasRequiredKeys(this.requiredKeys, o);
            ensureNoInvalidCharacters(this.bannedKeys, o);
            ensureEnums(this.enumKeys, o);
        });
        const putObjs: T[] = obj.map(o => this.convertObjectToPutObject(o));

        putObjs.forEach(o => ensureNoExtraKeys(this.knownKeys, o));

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
        const remove: (keyof T)[] = (this.props.trimConstants) ? removeItems(obj.remove, this.constantKeys) as (keyof T)[] : obj.remove;
        const append = (this.props.trimConstants) ? removeItems(obj.append, this.constantKeys) : obj.append;
        let set = slugifyKeys(this.slugKeys, obj.set);
        if (this.props.trimConstants) {
            set = removeItems(obj.set, this.constantKeys);
        }

        ensureDoesNotHaveConstantKeys(this.constantKeys.concat(this.requiredKeys), remove);
        ensureDoesNotHaveConstantKeys(this.constantKeys, append);
        ensureDoesNotHaveConstantKeys(this.constantKeys, set);
        ensureNoInvalidCharacters(this.bannedKeys, set);
        ensureNoExtraKeys(this.knownKeys, set);
        ensureEnums(this.enumKeys, set);

        return this.db.update<T>(this.tableName, key, { set, remove, append }, conditionExpression as ConditionExpression, returnType);
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

    private convertObjectToPutObject(obj: T): T {
        let putObj = slugifyKeys(this.slugKeys, obj);
        if (this.props.trimUnknown) {
            putObj = subset(putObj, this.knownKeys) as T;
        }
        return putObj;
    }

    private convertObjFromDynamo(dynamoObj: T): T;
    private convertObjFromDynamo<P extends keyof T>(dynamoObj: Pick<T, P>): Pick<T, P>;
    private convertObjFromDynamo<P extends keyof T>(dynamoObj: T | Pick<T, P>): T | Pick<T, P> {
        // This isn't going to copy the original object because dynamo objects come from us, so it doesn't matter if it changes.
        for (let key in this.keyConverters) {
            if (dynamoObj.hasOwnProperty(key)) {
                (dynamoObj as T)[key] = this.keyConverters[key].fromObj((dynamoObj as T)[key]);
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
        for (let key in this.keyConverters) {
            copy[key] = this.keyConverters[key].toObj(obj[key]);
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

function ensureNoExtraKeys<T>(knownKeys: (keyof T)[], obj: T) {
    if (obj) {
        for (const key of Object.keys(obj)) {
            if (knownKeys.indexOf(key as keyof T) < 0) {
                throw new Error("Key '" + key + "' is not defined in the table.");
            }
        }
    }
}

function ensureNoInvalidCharacters<T>(bannedKeys: BannedKeys<T>, obj: T) {
    for (let key in bannedKeys) {
        const value = obj[key];
        if (typeof value === "string") {
            if (bannedKeys[key].test(value)) {
                throw new Error("Invalid character found in key '" + value + "'.");
            }
        }// Else could be undefined.  It's not our job to judge here.
    }
}

function ensureEnums<T>(keysWithEnums: EnumKeys<T>, obj: T) {
    for (let key in keysWithEnums) {
        const value = obj[key];
        if (typeof value === "string") {
            if (keysWithEnums[key].indexOf(value) < 0) {
                throw new Error("Invalid enum value '" + value + "' for key '" + key + "'.");
            }
        }
    }
}

function slugifyKeys<T>(keysToSlug: SlugKeys<T>, obj: T): T {
    const copy: T = { ...obj as any };
    for (let key in keysToSlug) {
        const value = obj[key];
        if (typeof value === "string") {
            const slugParams = (typeof keysToSlug[key] === "object") ? keysToSlug[key] : undefined;
            copy[key] = slugify(value, slugParams);
        }
    }
    return copy;
}