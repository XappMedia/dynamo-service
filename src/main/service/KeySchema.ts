/**
 * The values here correspond with DynamoDB value types.
 *
 * Values:
 *      S: A string
 *      N: A number
 *      M: A map
 *      L: An array
 */
export type DynamoType = "S" | "N" | "M" | "L";

/**
 * The values here are special Stentor types.  They may have special attributes that allow
 * for special checks and/or conversions.
 *
 * Values:
 *      Date: A Date object.  These will be converted to DynamoDB formatted values.
 */
export type StentorType = "Date";

export interface NormalSchema {
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
}

/**
 * An object that can be sent straight in to dynamo as is.
 */
export interface DynamoSchema extends NormalSchema {
    type: DynamoType;
}

export interface DynamoStringSchema extends DynamoSchema {
    type: "S";
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

export type KeySchema = DynamoSchema | DateSchema | DynamoStringSchema;

/**
 * The actual schema for the given table.  The key is the name of the column in DynamoDB and the schema is
 * the attributes of the table.
 */
export interface TableSchema {
    [key: string]: KeySchema;
}