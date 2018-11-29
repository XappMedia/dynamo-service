/**
 * A Key Converter is is intended to convert an object from it's Javascript form to one that DynamoDB is capable of reading.
 *
 * This form must be reversable.
 *
 * An example of this would be the Date object.  A javascript Date object when converted to an ISOString format before finally getting
 * sent to the database. When the client retrieves the item, it will convert the ISO formatted string back to a date object before
 * continuing on to the remainder of the program.
 *
 * @export
 * @interface Converter
 * @template From
 * @template To
 */
export interface Converter<From, To> {
    /**
     * Converts the original object to another object.
     */
    toObj(obj: From): To;
    /**
     * Converts the converted object back to it's original object.
     */
    fromObj(obj: To): From;
}