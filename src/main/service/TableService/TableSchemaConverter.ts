import { removeItems, subset } from "../../utils/Object";
import { Converter } from "../Converters";
import { toIso, toTimestamp } from "../Converters";
import { UpdateBody } from "../DynamoService";
import { isDynamoStringSchema, KeySchema, SlugifyParams, TableSchema } from "../KeySchema";

const slugify = require("slugify");

export interface TableSchemaConverterProps {
}

/**
 * Props for when converting the entire object to the rules of the schema.
 *
 * @export
 * @interface ConvertWholeItemProps
 */
export interface ConvertWholeItemProps {
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

/**
 * Props for when converting the update object to the rules of the schema.
 *
 * @export
 * @interface ConvertUpdateItemProps
 */
export interface ConvertUpdateItemProps {
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

/**
 * Props for when converting an object returned from DynamoDB to the object that fits the rules in the schema.
 *
 * @export
 * @interface ConvertFromDynamoProps
 */
export interface ConvertFromDynamoProps {
    /**
     * If true, then keys will be removed from an object if they are put or set but not defined
     * in the table schema. By default, this is false in which case an error will be thrown if they are included.
     */
    trimUnknown?: boolean;
    /**
     * A list or regex of columns with which to ignore when querying items.  This items will be stripped from the
     * returned object if it matches.
     */
    ignoreColumnsInGet?: RegExp | RegExp[];
}

function getConverter(schema: KeySchema): Converter<any, any> {
    if (schema.type === "Date") {
        return schema.dateFormat === "Timestamp" ? toTimestamp : toIso;
    }
}

type KeyConverter<T> = Partial<Record<keyof T, Converter<any, any>>>;
type SlugKeys<T> = Partial<Record<keyof T, boolean | SlugifyParams>>;

export class TableSchemaConverter<T extends object> {
    // private readonly props: TableSchemaConverterProps;
    private readonly knownKeys: (keyof T)[] = [];
    private readonly constantKeys: (keyof T)[] = [];
    private readonly keyConverters: KeyConverter<T> = {};
    private readonly slugKeys: SlugKeys<T> = {};

    constructor(tableSchema: TableSchema<T>, props: TableSchemaConverterProps = {}) {
        // this.props = props;

        for (const key in tableSchema) {
            const v = tableSchema[key];

            this.knownKeys.push(key);

            const converter = getConverter(v);
            if (converter) {
                this.keyConverters[key as keyof T] = converter;
            }

            if (v.constant) {
                this.constantKeys.push(key);
            }

            if (isDynamoStringSchema(v)) {
                if (v.slugify) {
                    this.slugKeys[key] = v.slugify;
                }
            }
        }
    }

    /**
     * Converts an object to fit the rules that are defined in the schema.
     *
     * Constants are not trimmed or removed as these are not intended for updated.
     *
     * @param {T} obj
     * @returns {T}
     * @memberof TableSchemaConverter
     */
    convertObj(obj: T, props: ConvertWholeItemProps = {}): T {
        // tslint:disable:no-null-keyword Checking double equals with null checks for both undefined and null
        if (obj == null) return obj;
        // tslint:enable:no-null-keyword
        let finalObj: T = (props.trimUnknown) ? subset(obj, this.knownKeys) as T : obj;
        finalObj = (props.trimConstants) ? removeItems(finalObj, this.constantKeys) as T : finalObj;
        finalObj = slugifyKeys<T>(this.slugKeys, finalObj);
        return finalObj;
    }

    convertUpdateObj(obj: UpdateBody<T>, props: ConvertUpdateItemProps = {}): UpdateBody<T> {
        const remove: (keyof T)[] = (props.trimConstants) ? removeItems(obj.remove, this.constantKeys) as (keyof T)[] : obj.remove;

        const append = (props.trimConstants) ? removeItems(obj.append, this.constantKeys) : obj.append;

        let set = slugifyKeys(this.slugKeys, obj.set);
        set = (props.trimConstants) ? removeItems(set, this.constantKeys) : set;

        return { remove, append, set };
    }

    convertObjFromDynamo(dynamoObj: T, props?: ConvertFromDynamoProps): T;
    convertObjFromDynamo(dynamoObj: T[], props?: ConvertFromDynamoProps): T[];
    convertObjFromDynamo<P extends keyof T>(dynamoObj: Pick<T, P>, props?: ConvertFromDynamoProps): Pick<T, P>;
    convertObjFromDynamo<P extends keyof T>(dynamoObj: Pick<T, P>[], props?: ConvertFromDynamoProps): Pick<T, P>[];
    convertObjFromDynamo<P extends keyof T>(dynamoObj: T | T[] | Pick<T, P> | Pick<T, P>[], props: ConvertFromDynamoProps = {}): T | T[] | Pick<T, P> | Pick<T, P>[] {
        // tslint:disable:no-null-keyword Checking double equals with null checks for both undefined and null
        if (dynamoObj == null) return dynamoObj;
        // tslint:enable:no-null-keyword

        const convertObj = (obj: T): T => {
            let newObj = (props.trimUnknown) ? subset(obj, this.knownKeys) as T : { ...obj as object } as T;
            removeIgnoredColumns(props.ignoreColumnsInGet, newObj);
            convertKeys(this.keyConverters, newObj);
            return newObj;
        };

        return Array.isArray(dynamoObj) ? (dynamoObj as T[]).map((o) => convertObj(o)) : convertObj(dynamoObj as T);
    }

    convertObjToDynamo<K extends Partial<T>>(obj: K): object;
    convertObjToDynamo<K extends Partial<T>>(obj: K[]): object[];
    convertObjToDynamo<K extends Partial<T>>(obj: K | K[]): object | object[] {
        // tslint:disable:no-null-keyword Checking double equals with null checks for both undefined and null
        if (obj == null) return obj;
        // tslint:enable:no-null-keyword

        const convertObj = (o: K): object => {
            const copy: any = { ...o as object };
            for (const key in this.keyConverters) {
                if (o.hasOwnProperty(key)) {
                    copy[key] = this.keyConverters[key].toObj(copy[key]);
                }
            }
            return copy;
        };

        return Array.isArray(obj) ? obj.map(o => convertObj(o)) : convertObj(obj);
    }
}

function convertKeys<T>(keyConverters: KeyConverter<T>, obj?: T) {
    if (obj) {
        for (const key in keyConverters) {
            if (obj.hasOwnProperty(key)) {
                obj[key as keyof T] = keyConverters[key as keyof T].fromObj(obj[key as keyof T]);
            }
        }
    }
}

function removeIgnoredColumns<T>(ignoredColumns: RegExp | RegExp[] = [], obj?: T) {
    const ignoredItems = Array.isArray(ignoredColumns) ? ignoredColumns : [ignoredColumns];
    if (obj) {
        for (const ignoredItem of ignoredItems) {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (ignoredItem.test(key)) {
                        delete obj[key];
                    }
                }
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