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
 */
export type StentorType = "Date";

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
     * @type {Processor<DataType>}
     * @memberof DynamoStringSchema
     */
    process?: Processor<DataType>;
}

/**
 * An object that can be sent straight in to dynamo as is.
 */
export interface DynamoSchema<DataType = unknown> extends NormalSchema<DataType> {
    type: DynamoType;
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

/**
 * A function which will take in the old version of something and return a new.
 */
export type Processor<T> = (old: T) => T;

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

export interface NormalMapAttribute<DataType = unknown> {
    type: DynamoType;
    /**
     * Whether or not the attribute is required in the map.
     *
     * @type {boolean}
     * @memberof MapAttribute
     */
    required?: boolean;
    /**
     * A pre-processor function which will convert the string
     * from one to another.  This will be called before any validations
     * or other processors.
     *
     * @type {Processor<DataType>}
     * @memberof DynamoStringSchema
     */
    process?: Processor<DataType>;
}

export interface StringMapAttribute extends NormalMapAttribute<string> {
    type: "S";
    /**
     * The format that the string must be in order to be placed in the database.
     */
    format?: RegExp;
    /**
     * Characters that are not allowed in this particular item.
     *
     * Characters in this string will be split into individual characters.
     */
    invalidCharacters?: string;
    /**
     * These are strings that the interface must be in order to be inserted in to the database.
     */
    enum?: string[];
}

export interface MapMapAttribute extends NormalMapAttribute {
    type: "M";
    /**
     * The attributes that are inside the map.
     *
     * @type {KeySchema}
     * @memberof MapSchema
     */
    attributes?: MapAttributes;
    /**
     * If true, an error will be thrown if an attribute is
     * included in an object and it is not defined in the `attributes`
     * map. This attribute is ignored if no items are defined in the attributes map.
     *
     * Default: false
     */
    onlyAllowDefinedAttributes?: boolean;
}

/**
 * Kinds attributes that can be applied to a map
 */
export type MapAttribute = NormalMapAttribute;

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

export interface MapSchema extends NormalSchema {
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

export type KeySchema = DynamoSchema | DateSchema | DynamoStringSchema | MapSchema;

/**
 * The actual schema for the given table.  The key is the name of the column in DynamoDB and the schema is
 * the attributes of the table.
 */
export type TableSchema<Row extends object> = Record<keyof Row, KeySchema>;

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
 * Type guard that looks to see if the map attribute is a StringMapAttribute
 *
 * @export
 * @param {MapAttribute} v
 * @returns {v is StringMapAttribute}
 */
export function isStringMapAttribute(v: MapAttribute): v is StringMapAttribute {
    return v.type === "S";
}

/**
 * Type guard that looks to see if the map attribute is a MapMapAttribute
 *
 * @export
 * @param {MapAttribute} v
 * @returns {v is MapMapAttribute}
 */
export function isMapMapAttribute(v: MapAttribute): v is MapMapAttribute {
    return v.type === "M";
}