import * as runes from "runes";
import { removeItems, subset } from "../../utils/Object";
import { Converter } from "../Converters";
import { toIso, toTimestamp } from "../Converters";
import { Set, UpdateBody } from "../DynamoService";
import {
    CharMap,
    isDynamoStringSchema,
    isMapMapAttribute,
    isMapSchema,
    KeySchema,
    MapSchema,
    Processor,
    SlugifyParams,
    TableSchema } from "../KeySchema";

const slugify = require("slugify");

export interface TableSchemaConverterProps {}

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
type MapSchemas<T extends object> = Partial<Record<keyof T, MapSchema>>;
type Processors<T> = Partial<Record<keyof T, Processor<any>>>;

interface ParsedKeys<T extends object> {
    readonly knownKeys: (keyof T)[];
    readonly constantKeys: (keyof T)[];
    readonly keyProcessors: Processors<T>;
    readonly keyConverters: KeyConverter<T>;
    readonly slugKeys: SlugKeys<T>;
    readonly knownMaps: MapSchemas<T>;
}

class TableSchemaParser<T extends object> implements ParsedKeys<T> {
    readonly knownKeys: (keyof T)[] = [];
    readonly constantKeys: (keyof T)[] = [];
    readonly knownMaps: MapSchemas<T> = {};
    readonly keyConverters: KeyConverter<T> = {};
    readonly slugKeys: SlugKeys<T> = {};
    readonly keyProcessors: Processors<T> = {};

    constructor(tableSchema: TableSchema<T>) {
        this.knownKeys = Object.keys(tableSchema || []) as (keyof T)[];
        for (const key of this.knownKeys) {
            const v = tableSchema[key];

            if (v.process) {
                this.keyProcessors[key] = v.process;
            }

            const converter = getConverter(v);
            if (converter) {
                this.keyConverters[key as keyof T] = converter;
            }

            if (v.constant || v.primary || v.sort) {
                this.constantKeys.push(key);
            }

            if (isDynamoStringSchema(v)) {
                if (v.slugify) {
                    this.slugKeys[key] = v.slugify;
                }
            }

            if (isMapSchema(v)) {
                this.knownMaps[key] = v;
            }
        }
    }
}

class MapSchemaParser implements ParsedKeys<any> {
    readonly knownKeys: string[] = [];
    readonly constantKeys: string[] = [];
    readonly knownMaps: MapSchemas<any> = {};
    readonly keyConverters: KeyConverter<any> = {};
    readonly slugKeys: SlugKeys<any> = {};
    readonly keyProcessors: Processors<any> = {};

    constructor(mapSchema: MapSchema) {
        this.knownKeys = Object.keys(mapSchema.attributes || []);
        for (const key of this.knownKeys) {
            const v = mapSchema.attributes[key];

            if (v.process) {
                this.keyProcessors[key] = v.process;
            }

            const converter = getConverter(v);
            if (converter) {
                this.keyConverters[key] = converter;
            }

            if (isDynamoStringSchema(v)) {
                if (v.slugify) {
                    this.slugKeys[key] = v.slugify;
                }
            }
            if (isMapMapAttribute(v)) {
                this.knownMaps[key] = v;
            }
        }
    }
}

export class TableSchemaConverter<T extends object> {
    // private readonly props: TableSchemaConverterProps;
    private readonly parsedKeys: TableSchemaParser<T>;

    constructor(tableSchema: TableSchema<T>, props: TableSchemaConverterProps = {}) {
        // this.props = props;
        this.parsedKeys = new TableSchemaParser(tableSchema);
    }

    /**
     * Converts an object to fit the rules that are defined in the schema.
     *
     * This is intended to convert an object before it gets sent to a dynamo table.
     *
     * Meaning that unknown items will be removed and items can be slugified for example.
     *
     * After this conversion, the item can be verified before finally getting sent to dynamo. The
     * changes won't be reversable like those in ConvertObjFromDynamo and ConvertObjToDynamo methods.
     *
     * @param {T} obj
     * @returns {T}
     * @memberof TableSchemaConverter
     */
    convertObj(obj: T, props?: ConvertWholeItemProps): T {
        return convertObject(this.parsedKeys, obj, props);
    }

    /**
     * Similar to the ConvertObj function, it converts the elements in an UpdateObj to the rules that are defined in
     * the table schema.
     *
     * This is intended to convert an object before it gets sent to a dynamo table. After the conversion, the
     * object can pass through a final validation stage before being sent to dynamo.
     *
     * @param {UpdateBody<T>} obj
     * @param {ConvertUpdateItemProps} [props]
     * @returns {UpdateBody<T>}
     * @memberof TableSchemaConverter
     */
    convertUpdateObj(obj: UpdateBody<T>, props?: ConvertUpdateItemProps): UpdateBody<T> {
        return convertUpdateObj(this.parsedKeys, obj, props);
    }

    /**
     * This converts an object that is received from the dynamo table to the object that it is supposed to be based on the rules of
     * the schema.
     *
     * It will run all key converters. It is the reverse of "convertObjToDynamo".
     *
     * @param {T} dynamoObj
     * @param {ConvertFromDynamoProps} [props]
     * @returns {T}
     * @memberof TableSchemaConverter
     */
    convertObjFromDynamo(dynamoObj: T, props?: ConvertFromDynamoProps): T;
    convertObjFromDynamo(dynamoObj: T[], props?: ConvertFromDynamoProps): T[];
    convertObjFromDynamo<P extends keyof T>(dynamoObj: Pick<T, P>, props?: ConvertFromDynamoProps): Pick<T, P>;
    convertObjFromDynamo<P extends keyof T>(dynamoObj: Pick<T, P>[], props?: ConvertFromDynamoProps): Pick<T, P>[];
    convertObjFromDynamo<P extends keyof T>(dynamoObj: T | T[] | Pick<T, P> | Pick<T, P>[], props: ConvertFromDynamoProps): T | T[] | Pick<T, P> | Pick<T, P>[] {
        // tslint:disable:no-null-keyword Checking double equals with null checks for both undefined and null
        if (dynamoObj == null) return dynamoObj;
        // tslint:enable:no-null-keyword

        function convertObj<K extends object>(parsedKeys: ParsedKeys<K>, obj: K, props: ConvertFromDynamoProps = {}): K {
            let newObj: K = props.trimUnknown ? subset(obj, parsedKeys.knownKeys) as K : ({ ...(obj as object) } as K);
            removeIgnoredColumns(props.ignoreColumnsInGet, newObj);
            convertKeysFromObj(parsedKeys.keyConverters, newObj);
            for (const mapKey in parsedKeys.knownMaps) {
                if (isObject(newObj[mapKey as keyof K])) {
                    const mapSchema = parsedKeys.knownMaps[mapKey];
                    newObj[mapKey] = convertObj<any>(new MapSchemaParser(mapSchema), newObj[mapKey]);
                }
            }
            return newObj;
        }

        return Array.isArray(dynamoObj) ? (dynamoObj as T[]).map(o => convertObj(this.parsedKeys, o, props)) : convertObj(this.parsedKeys, dynamoObj as T, props);
    }

    /**
     * This is intended to convert objects from its current form to one that can be read by DynamoDB. It is the reverse of
     * "convertObjFromDynamo".
     *
     * @template K
     * @param {K} obj
     * @returns {object}
     * @memberof TableSchemaConverter
     */
    convertObjToDynamo<K extends Partial<T>>(obj: K): object;
    convertObjToDynamo<K extends Partial<T>>(obj: K[]): object[];
    convertObjToDynamo<K extends Partial<T>>(obj: K | K[]): object | object[] {
        // tslint:disable:no-null-keyword Checking double equals with null checks for both undefined and null
        if (obj == null) return obj;
        // tslint:enable:no-null-keyword

        function convertObj<L extends object>(parsedKeys: ParsedKeys<L>, o: L): object {
            let copy: any = { ...(o as object) };
            convertKeysToObj(parsedKeys.keyConverters, copy);
            for (const mapKey in parsedKeys.knownMaps) {
                if (isObject(copy[mapKey])) {
                    const mapSchema = parsedKeys.knownMaps[mapKey];
                    copy[mapKey] = convertObj<any>(new MapSchemaParser(mapSchema), copy[mapKey]);
                }
            }
            return copy;
        }

        return Array.isArray(obj) ? obj.map(o => convertObj<Partial<T>>(this.parsedKeys, o)) : convertObj<Partial<T>>(this.parsedKeys, obj);
    }
}

function isObject(item: any): item is object {
    return !!item && typeof item === "object" && !Array.isArray(item);
}

function convertObject<T extends object>(parsedKeys: ParsedKeys<T>, obj: T, props: ConvertWholeItemProps = {}) {
    // tslint:disable:no-null-keyword Checking double equals with null checks for both undefined and null
    if (obj == null) return obj;
    // tslint:enable:no-null-keyword
    const { trimUnknown, trimConstants } = props;
    const { knownKeys, constantKeys, slugKeys, knownMaps, keyProcessors } = parsedKeys;
    let finalObj: T = trimUnknown ? (subset(obj, knownKeys) as T) : obj;
    finalObj = trimConstants ? (removeItems(finalObj, constantKeys) as T) : finalObj;
    finalObj = processKeys<T>(keyProcessors, finalObj);
    finalObj = slugifyKeys<T>(slugKeys, finalObj);

    for (const mapKey in knownMaps) {
        if (isObject(finalObj[mapKey])) {
            const mapSchema = knownMaps[mapKey];
            finalObj[mapKey] = convertObject<any>(new MapSchemaParser(mapSchema), finalObj[mapKey], props);
        }
    }

    return finalObj;
}

function convertUpdateObj<T extends object>(parsedKeys: ParsedKeys<T>, obj: UpdateBody<T>, props: ConvertUpdateItemProps = {}) {
    const { trimConstants } = props;
    const { constantKeys, slugKeys, knownMaps, keyProcessors } = parsedKeys;
    const { remove, append, set } = obj;

    const newRemove: (keyof T)[] = trimConstants
        ? (removeItems(remove, constantKeys) as (keyof T)[])
        : remove;

    const newAppend = trimConstants ? removeItems(append, constantKeys) : append;
    let newSet = processKeys<Set<T>>(keyProcessors, set);
    newSet = slugifyKeys<Set<T>>(slugKeys, newSet);
    newSet = trimConstants ? removeItems(newSet, constantKeys) : newSet;

    for (const mapKey in knownMaps) {
        if (isObject(newSet[mapKey])) {
            const mapSchema = knownMaps[mapKey];
            newSet[mapKey] = convertObject<any>(new MapSchemaParser(mapSchema), newSet[mapKey], props);
        }
    }

    const updateBody: UpdateBody<T> = { };
    if (newSet) updateBody.set = newSet;
    if (newAppend) updateBody.append = newAppend;
    if (newRemove) updateBody.remove = newRemove;
    return updateBody;
}

function convertKeysToObj<T>(keyConverters: KeyConverter<T>, obj?: T) {
    if (obj) {
        for (const key in keyConverters) {
            if (obj.hasOwnProperty(key)) {
                obj[key as keyof T] = keyConverters[key as keyof T].toObj(obj[key as keyof T]);
            }
        }
    }
}

function convertKeysFromObj<T>(keyConverters: KeyConverter<T>, obj?: T) {
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

function processKeys<T>(processors: Processors<T>, obj: T): T {
    const copy: T = { ...(obj as any) };
    const keysToProcess = Object.keys(processors) as (keyof T)[];
    for (let key of keysToProcess) {
        const processor = processors[key];
        if (copy[key]) {
            copy[key] = processor(obj[key]);
        }
    }
    return copy;
}

function slugifyKeys<T>(keysToSlug: SlugKeys<T>, obj: T): T {
    const copy: T = { ...(obj as any) };
    for (let key in keysToSlug) {
        const value = obj[key];
        if (typeof value === "string") {
            const slugSetup: boolean | SlugifyParams = keysToSlug[key];
            let valueToSlug: string = value;
            let slugifyParams: Pick<SlugifyParams, "remove">;
            if (isSlugParams(slugSetup)) {
                const { charMap, ...params } = slugSetup;
                slugifyParams = params;
                valueToSlug = replaceChars(value, charMap);
            }
            copy[key] = slugify(valueToSlug, slugifyParams);
        }
    }
    return copy;
}

function isSlugParams(params: boolean | SlugifyParams): params is SlugifyParams {
    return !!params && typeof params === "object";
}

function replaceChars(stringValue: string, charMap: CharMap): string {
    if (!charMap) {
        return stringValue;
    }

    // tslint:disable:no-null-keyword checking for null and undefined.
    return runes(stringValue).reduce((replacement, ch) =>
        replacement + (charMap[ch] || ch), "");
    // tslint:enable:no-null-keyword
}