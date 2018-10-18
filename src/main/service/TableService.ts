import { ConditionExpression, DynamoService, QueryParams, QueryResult, ScanParams, ScanResult, UpdateBody, UpdateReturnType } from "./DynamoService";
import { ValidationError } from "./ValidationError";

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
    ignoreColumnsInGet?: RegExp;
}

export interface PutAllReturn<T> {
    unprocessed: T[];
}

interface SlugParams {

}

type KeyConverter<T> = Partial<Record<keyof T, Converter<any, any>>>;
type BannedKeys<T> = Partial<Record<keyof T, RegExp>>;
type FormattedKeys<T> = Partial<Record<keyof T, RegExp>>;
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
    readonly tableSchema: TableSchema<T>;

    private readonly primaryKey: keyof T;
    private readonly sortKey: keyof T;
    private readonly requiredKeys: (keyof T)[] = [];
    private readonly constantKeys: (keyof T)[] = [];
    private readonly knownKeys: (keyof T)[] = [];

    private readonly bannedKeys: BannedKeys<T> = {};
    private readonly formattedKeys: FormattedKeys<T> = {};
    private readonly keyConverters: KeyConverter<T> = {};
    private readonly enumKeys: EnumKeys<T> = {};
    private readonly slugKeys: SlugKeys<T> = {};

    private readonly db: DynamoService;
    private readonly props: TableServiceProps;

    constructor(tableName: string, db: DynamoService, tableSchema: TableSchema<T>, props: TableServiceProps = {}) {
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
                if (v.format) {
                    this.formattedKeys[key as keyof T] = v.format;
                }
            }
        }
        if (primaryKeys.length === 0) {
            throw new ValidationError("Table " + tableName + " must include a primary key.");
        }
        if (primaryKeys.length > 1) {
            throw new ValidationError("Table " + tableName + " must only have one primary key.");
        }
        if (sortKeys.length > 1) {
            throw new ValidationError("Table " + tableName + " can not have more than one sort key.");
        }

        this.primaryKey = primaryKeys[0];
        this.sortKey = sortKeys[0];
    }

    put(obj: T, condition?: ConditionExpression): Promise<T> {
        ensureHasRequiredKeys(this.requiredKeys, obj);
        ensureNoInvalidCharacters(this.bannedKeys, obj);
        ensureEnums(this.enumKeys, obj);
        ensureFormat(this.formattedKeys, obj);

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
            ensureFormat(this.formattedKeys, o);
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
        set = this.convertObjToDynamo(set);
        if (this.props.trimConstants) {
            set = removeItems(set, this.constantKeys);
        }

        ensureDoesNotHaveConstantKeys(this.constantKeys.concat(this.requiredKeys), remove);
        ensureDoesNotHaveConstantKeys(this.constantKeys, append);
        ensureDoesNotHaveConstantKeys(this.constantKeys, set);
        ensureNoInvalidCharacters(this.bannedKeys, set);
        ensureNoExtraKeys(this.knownKeys, set);
        ensureEnums(this.enumKeys, set);
        ensureFormat(this.formattedKeys, set);

        const dynamoKey = this.convertObjToDynamo(key);
        return this.db
            .update<T>(this.tableName, dynamoKey, { set, remove, append }, conditionExpression as ConditionExpression, returnType)
            .then((results) => {
                if (results) {
                    // Typescript thinks it's void, but we know the truth.  It also won't let us cast to T.
                    return this.cleanseObjectOfIgnoredGetItems(results as any);
                }
            });
    }

    get(key: Partial<T>): Promise<T>;
    get(key: Partial<T>[]): Promise<T[]>;
    get<P extends keyof T>(key: Partial<T>, projection: P | P[]): Promise<Pick<T, P>>;
    get<P extends keyof T>(key: Partial<T>[], projection: P | P[]): Promise<Pick<T, P>[]>;
    get<P extends keyof T>(key: Partial<T> | Partial<T>[], projection?: P | P[]): Promise<Pick<T, P>> | Promise<T> | Promise<Pick<T, P>[]> | Promise<T[]>  {
        const realKey = (Array.isArray(key)) ?
            key.map(key => this.convertObjToDynamo(key)) :
            this.convertObjToDynamo(key);
        return this.db.get<T, P>(this.tableName, realKey, projection)
                .then(item => (Array.isArray(item)) ? item.map((item) => this.convertObjFromDynamo(item)) : this.convertObjFromDynamo(item))
                .then(item => (Array.isArray(item)) ? item.map((item) => this.cleanseObjectOfIgnoredGetItems(item)) : this.cleanseObjectOfIgnoredGetItems(item))
                .then(item => item as any);
    }

    query(params: QueryParams): Promise<QueryResult<T>>;
    query<P extends keyof T>(params: QueryParams, projection: P | P[]): Promise<QueryResult<Pick<T, P>>>;
    query<P extends keyof T>(params: QueryParams, projection?: P | P[]): Promise<QueryResult<T>> | Promise<QueryResult<Pick<T, P>>> {
        return this.db.query<T, P>(this.tableName, params, projection)
            .then(items => this.convertObjectsFromDynamo(items))
            .then(items => this.cleanseIgnoredItemsOfDynamoObject(items));
    }

    scan(params: ScanParams): Promise<ScanResult<T>>;
    scan<P extends keyof T>(params: ScanParams, projection: P | P[]): Promise<ScanResult<Pick<T, P>>>;
    scan<P extends keyof T>(params: ScanParams, projection?: P | P[]): Promise<ScanResult<T>> | Promise<ScanResult<Pick<T, P>>>  {
        return this.db.scan<T, P>(this.tableName, params, projection)
            .then(items => this.convertObjectsFromDynamo(items))
            .then(items => this.cleanseIgnoredItemsOfDynamoObject(items));
    }

    delete(key: Partial<T> | Partial<T>[]): Promise<void> {
        const dynamoKey = Array.isArray(key) ? key.map(k => this.convertObjToDynamo(k)) : this.convertObjToDynamo(key);
        return this.db.delete(this.tableName, dynamoKey);
    }

    private cleanseObjectOfIgnoredGetItems(obj: T): T;
    private cleanseObjectOfIgnoredGetItems<P extends keyof T>(obj: Pick<T, P>): Pick<T, P>;
    private cleanseObjectOfIgnoredGetItems<P extends keyof T>(obj: T | Pick<T, P>): T | Pick<T, P> {
        if (!obj || !this.props.ignoreColumnsInGet) {
            return obj;
        }

        const keys = Object.keys(obj) as (keyof T)[];
        const ignoredInGetKeys = [this.props.ignoreColumnsInGet];
        for (let ignored of ignoredInGetKeys) {
            for (let key of keys) {
                if (ignored.test(key)) {
                    delete (obj as T)[key];
                }
            }
        }
        return obj;
    }

    private cleanseIgnoredItemsOfDynamoObject(results: QueryResult<T>): QueryResult<T>;
    private cleanseIgnoredItemsOfDynamoObject<P extends keyof T>(results: QueryResult<Pick<T, P>>): QueryResult<Pick<T, P>>;
    private cleanseIgnoredItemsOfDynamoObject(results: ScanResult<T>): ScanResult<T>;
    private cleanseIgnoredItemsOfDynamoObject<P extends keyof T>(results: ScanResult<Pick<T, P>>): ScanResult<Pick<T, P>>;
    private cleanseIgnoredItemsOfDynamoObject<P extends keyof T>(results: ScanResult<T> | ScanResult<Pick<T, P>> | QueryResult<T> | QueryResult<Pick<T, P>>): ScanResult<T> | ScanResult<Pick<T, P>> | QueryResult<T> | QueryResult<Pick<T, P>> {
        results.Items = (results.Items as T[]).map(item => this.cleanseObjectOfIgnoredGetItems(item));
        return results;
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
        if (dynamoObj) {
            for (let key in this.keyConverters) {
                if (dynamoObj.hasOwnProperty(key)) {
                    (dynamoObj as T)[key] = this.keyConverters[key].fromObj((dynamoObj as T)[key]);
                }
            }
        }
        return dynamoObj;
    }

    private convertObjectsFromDynamo(dynamoObj: QueryResult<T>): QueryResult<T>;
    private convertObjectsFromDynamo<P extends keyof T>(dynamoObj: QueryResult<Pick<T, P>>): QueryResult<Pick<T, P>>;
    private convertObjectsFromDynamo<P extends keyof T>(dynamoObj: QueryResult<T> | QueryResult<Pick<T, P>>): QueryResult<T> | QueryResult<Pick<T, P>> {
        // I'm not sure what Typescript's issue is with this, so making an any.
        dynamoObj.Items = (dynamoObj.Items as T[]).map(item => this.convertObjFromDynamo(item));
        return dynamoObj;
    }

    private convertObjToDynamo<K extends Partial<T>>(obj: K) {
        const copy: K = { ...obj as object } as K;
        for (let key in this.keyConverters) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = this.keyConverters[key].toObj(obj[key]);
            }
        }
        return copy;
    }
}

function ensureHasRequiredKeys<T>(requiredKeys: (keyof T)[], obj: T) {
    throwIfDoesNotContain(obj, requiredKeys, false, (missingKeys) => {
        throw new ValidationError("The the object requires the keys '" + missingKeys.join(", ") + "'.");
    });
}

function ensureDoesNotHaveConstantKeys<T>(constantKeys: (keyof T)[], obj: Partial<T> | (keyof T)[]) {
    throwIfDoesContain(obj as any, constantKeys, (foundKeys) => {
        throw new ValidationError("The keys '" + foundKeys.join(", ") + "' are constant and can not be modified.");
    });
}

function ensureNoExtraKeys<T>(knownKeys: (keyof T)[], obj: T) {
    if (obj) {
        for (const key of Object.keys(obj)) {
            if (knownKeys.indexOf(key as keyof T) < 0) {
                throw new ValidationError("Key '" + key + "' is not defined in the table.");
            }
        }
    }
}

function ensureNoInvalidCharacters<T>(bannedKeys: BannedKeys<T>, obj: T) {
    for (let key in bannedKeys) {
        const value = obj[key];
        if (typeof value === "string") {
            if (bannedKeys[key].test(value)) {
                throw new ValidationError("Invalid character found in key '" + value + "'.");
            }
        }// Else could be undefined.  It's not our job to judge here.
    }
}

function ensureEnums<T>(keysWithEnums: EnumKeys<T>, obj: T) {
    for (let key in keysWithEnums) {
        const value = obj[key];
        if (typeof value === "string") {
            if (keysWithEnums[key].indexOf(value) < 0) {
                throw new ValidationError("Invalid enum value '" + value + "' for key '" + key + "'.");
            }
        }
    }
}

function ensureFormat<T>(format: FormattedKeys<T>, obj: T) {
    for (let key in format) {
        const value = obj[key];
        if (typeof value === "string") {
            if (!format[key].test(value)) {
                throw new ValidationError("Invalid format '" + value + "' for key '" + key + "'.");
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