import { UpdateBody } from "./NormalSchemaBuilder";
import { Validator } from "./Validator";

// export function isConstantObjectValidator(): Validator<any> {
//     return (key, schema, obj) => {
//         if (schema.constant || schema.primary || schema.sort) {
//             return `Key "${key}" is constant and can not be modified.`;
//         }
//     };
// }

export function isConstantUpdateBodyValidator(): Validator<UpdateBody<any>> {
    return (key, schema, obj) => {
        const { set, remove, append } = obj;
        if (!isConstant(schema)) {
            return undefined;
        }
        // tslint:disable:no-null-keyword != null checks for both undefined and null
        if ((set && set.hasOwnProperty(key)) || // If it's in set
            (append && append.hasOwnProperty(key)) || // In append
            (remove && remove.indexOf(key) >= 0)) { // or in remove
                // Then we don't want it changing.
                return `Key "${key}" is constant and can not be modified.`;
        }
    };
}

/**
 * Returns whether the schema is a constant attribute meaning it should
 * never be changed once it's in the database.
 *
 * @export
 * @param {{ constant?: boolean, primary?: boolean, sort?: boolean }} schema
 */
export function isConstant(schema: { constant?: boolean, primary?: boolean, sort?: boolean }): boolean {
    return schema.constant || schema.primary || schema.sort || false;
}