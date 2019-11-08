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

export interface Converter<From, To> {
    /**
     * Converts the original object to another object.
     *
     * This process can be irreversible *if the "fromObj" method is not supplied.  In which case
     * this process is permanent.
     *
     * @param {From} obj
     * @returns {To}
     * @memberof Converter
     */
    toObj(obj: From): To;
    /**
     * Converts the converted object back to it's original object.
     *
     * If this method is not supplied, then the object will *not* be converted back to it's original state.
     * This makes the conversion *irreversible*.
     *
     * If this method is supplied, then the object will be converted *back* from
     * what was converted in the toObj.
     *
     * @param {To} obj
     * @returns {From}
     * @memberof Converter
     */
    fromObj?(obj: To): From;
}

/**
 * A function which will take in the old version of something and return a new.
 */
export type Processor<T> = (old: T) => T;

/**
 * The values here correspond with DynamoDB value types.
 *
 * Values:
 *      S: A string
 *      N: A number
 *      M: A map
 *      L: An array
 *      BOOL: Boolean value
 */
export type DynamoType = "S" | "N" | "M" | "L" | "BOOL";

/**
 * The values here are special Stentor types.  They may have special attributes that allow
 * for special checks and/or conversions.
 *
 * Values:
 *      Date: A Date object.  These will be converted to DynamoDB formatted values.
 *      Multiple: A type that can be many different values such as a String or a Number.
 */
export type StentorType = "Date" | "Multiple";

export type SchemaType = DynamoType | StentorType;

/**
 * A schema of this style can be multiple different types.
 *
 * If the "required" or "constant" is set, it will be
 * true for all types. "required" and "constant" attributes
 * in the schemas will be ignored.
 *
 * These can not be primary or sort keys.
 *
 * @export
 * @interface MultiSchema
 */
export interface MultiSchema {
    type: "Multiple";
    /**
     * True if the object requires this key to exist.
     */
    required?: boolean;
    /**
     * True if the object is constant once set.  This means that the value can not be changed or removed.
     */
    constant?: boolean;
    /**
     * The different kinds of values that this schema can be.
     *
     * @type {(Partial<Record<DynamoType | "Date", NormalSchema>>)}
     * @memberof MultiSchema
     */
    schemas: {
        "S"?: Pick<DynamoStringSchema, Exclude<keyof DynamoStringSchema, "type" | "primary" | "sort" | "required" | "constant">>
        "N"?: Pick<DynamoNumberSchema, Exclude<keyof DynamoNumberSchema, "type" | "primary" | "sort" | "required" | "constant">>
        "M"?: Pick<MapSchema, Exclude<keyof MapSchema, "type" | "primary" | "sort" | "required" | "constant">>
        "L"?: Pick<DynamoListSchema, Exclude<keyof DynamoListSchema, "type" | "primary" | "sort" | "required" | "constant">>
        "BOOL"?: Pick<DynamoBooleanSchema, Exclude<keyof DynamoBooleanSchema, "type" | "primary" | "sort" | "required" | "constant">>
    };
}

export interface NormalSchema<DataType = unknown> {
    /**
     * The type of object that this is.
     */
    type: string;
    /**
     * Indicates a primary key. A table must include one and only one.
     *
     * Every put object must include this value. The primary key can not be modified.
     */
    primary?: boolean;
    /**
     * Indicates a sort key. A table may or may not include one, but no more than one.
     *
     * Every put object must include this if it exists. The sort key can not be modified.
     */
    sort?: boolean;
    /**
     * True if the object requires this key to exist.
     */
    required?: boolean;
    /**
     * True if the object is constant once set.  This means that the value can not be changed or removed.
     */
    constant?: boolean;
    /**
     * A pre-processor function which will convert the string
     * from one to another.  This will be called before any validations
     * or other processors.
     *
     * @type {Processor<DataType>[]}
     * @memberof NormalSchema
     */
    process?: Processor<DataType> | Converter<DataType, any> | (Processor<DataType> | Converter<DataType, any>)[];
}

/**
 * An object that can be sent straight in to dynamo as is.
 */
export interface DynamoSchema<DataType = unknown> extends NormalSchema<DataType> {
    type: DynamoType;
}

export interface DynamoBooleanSchema extends DynamoSchema<boolean> {
    type: "BOOL";
}

export interface DynamoNumberSchema extends DynamoSchema<number> {
    type: "N";
    /**
     * Restrict the value to only integers.
     *
     * @type {boolean}
     * @memberof DynamoNumberSchema
     */
    integer?: boolean;
}

export interface DynamoListSchema<DataType = unknown> extends DynamoSchema<DataType> {
    type: "L";
}

/**
 * Replace the default character map with the current one.
 *
 * Unicode characters that are not in this list will be removed from the
 * slugged name.
 *
 * @export
 * @interface CharMap
 */
export interface CharMap {
    [character: string]: string;
}

export interface SlugifyParams {
    lower?: boolean;
    charMap?: CharMap;
    remove?: RegExp;
}

export interface DynamoStringSchema extends DynamoSchema<string> {
    type: "S";
    /**
     * The format that the string must be in order to be placed in the database.
     *
     * @type {RegExp}
     * @memberof DynamoStringSchema
     */
    format?: RegExp;
    /**
     * Characters that are not allowed in this particular item.
     *
     * Characters in this string will be split into individual characters.
     *
     * @type {string}
     * @memberof DynamoStringSchema
     */
    invalidCharacters?: string;
    /**
     * These are strings that the interface must be in order to be inserted in to the database.
     *
     * @type {string[]}
     * @memberof DynamoStringSchema
     */
    enum?: string[];
    /**
     * If true, the string will be slugged (Made URL friendly) before being inserted in to the table.
     *
     * @type {(boolean | SlugifyParams)}
     * @memberof DynamoStringSchema
     */
    slugify?: boolean | SlugifyParams;
}

/**
 * The type of format that the date object should be converted to.
 *
 * Values:
 *      ISO-8601 - An ISO-8601 formatted string.  This is the default.
 *      Timestamp - An UNIX timestamp format.
 */
export type DateFormat = "ISO-8601" | "Timestamp";

/**
 * Date Schemas imply that the object is a Date.
 * If the attribute passed in is a string, it will be validated as a Date object.  It will
 * then be converted in to the format that is set in the schema.
 */
export interface DateSchema extends NormalSchema {
    type: "Date";
    /**
     * The format that a Date Object will be converted to.
     */
    dateFormat?: DateFormat;
}

export type NormalMapAttribute<DataType = unknown> = Pick<NormalSchema<DataType>, Exclude<keyof NormalSchema, "primary" | "sort">>;
export type DateMapAttribute = Pick<DateSchema, Exclude<keyof DateSchema, "primary" | "sort">>;
export type StringMapAttribute = Pick<DynamoStringSchema, Exclude<keyof DynamoStringSchema, "primary" | "sort">>;
export type NumberMapAttribute = Pick<DynamoNumberSchema, Exclude<keyof DynamoNumberSchema, "primary" | "sort">>;
export type MapMapAttribute = Pick<MapSchema, Exclude<keyof MapSchema, "primary" | "sort">>;

/**
 * Kinds attributes that can be applied to a map
 */
export type MapAttribute = NormalMapAttribute | DateMapAttribute | StringMapAttribute | MapMapAttribute | NumberMapAttribute;

/**
 * Attributes that are placed inside a map where the
 * key of this map is a keyof the type that it represents.
 *
 * @export
 * @interface MapAttributes
 */
export interface MapAttributes {
    [attribute: string]: MapAttribute;
}

export interface MapSchema extends NormalSchema<object> {
    type: "M";
    /**
     * The attributes that are inside the map.
     *
     * The map can be anything if there are no attributes defined.
     *
     * @type {KeySchema}
     * @memberof MapSchema
     */
    attributes?: MapAttributes;
    /**
     * If true, an error will be thrown if an attribute is
     * included in an object and it is not defined in the `attributes`
     * map.
     *
     * Default: false
     */
    onlyAllowDefinedAttributes?: boolean;
}

export type KeySchema = DynamoSchema | DateSchema | DynamoStringSchema | MapSchema | MultiSchema;

/**
 * The actual schema for the given table.  The key is the name of the column in DynamoDB and the schema is
 * the attributes of the table.
 */
export type TableSchema<Row extends object> = Record<keyof Row, KeySchema>;

export function isBooleanSchema(v: KeySchema): v is DynamoBooleanSchema {
    return v.type === "BOOL";
}

/**
 * Type guard that looks to see if the key schema is a Date schema.
 *
 * @export
 * @param {KeySchema} v
 * @returns {v is DateSchema}
 */
export function isDateSchema(v: KeySchema): v is DateSchema {
    return v.type === "Date";
}

/**
 * Type guard that looks to see if the key schema is a Number schema.
 *
 * @export
 * @param {KeySchema} v
 * @returns {v is DynamoNumberSchema}
 */
export function isNumberSchema(v: KeySchema): v is DynamoNumberSchema {
    return v.type === "N";
}

/**
 * Type guard that looks to see if the key schema is a List schema.
 *
 * @export
 * @param {KeySchema} v
 * @returns {v is DynamoListSchema}
 */
export function isListSchema<DataType>(v: KeySchema): v is DynamoListSchema<DataType> {
    return v.type === "L";
}

/**
 * Type guard that looks to see if the key schema is a DynamoStringSchema.
 *
 * @export
 * @param {KeySchema} v
 * @returns {v is DynamoStringSchema}
 */
export function isDynamoStringSchema(v: KeySchema): v is DynamoStringSchema {
    return v.type === "S";
}

/**
 * Type guard that looks to see if the key schema is a MapStringSchema
 *
 * @export
 * @param {KeySchema} v
 * @returns {v is MapSchema}
 */
export function isMapSchema(v: KeySchema): v is MapSchema {
    return v.type === "M";
}

/**
 * Type guard that looks to see if the key schema is a MultiSchema
 *
 * @export
 * @param {KeySchema} v
 * @returns {v is MultiSchema}
 */
export function isMultiTypeSchema(v: KeySchema): v is MultiSchema {
    return v.type === "Multiple";
}
