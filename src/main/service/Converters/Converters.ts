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