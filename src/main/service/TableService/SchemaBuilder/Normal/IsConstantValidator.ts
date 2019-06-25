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
        const isConstant = schema.constant || schema.primary || schema.sort || false;
        if (!isConstant) {
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