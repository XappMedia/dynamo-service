import { UpdateBody } from "./NormalSchemaBuilder";
import { Validator } from "./Validator";

// tslint:disable:no-null-keyword != null checks for both undefined and null
export function isRequiredPutObjectValidator(): Validator<any> {
    return (key, schema, obj) => {
        if (schema.required || schema.primary || schema.sort) {
            if (obj == null) {
                return `Key "${key}" is required but is not defined.`;
            }
        }
    };
}

export function isRequiredUpdateBodyValidator(): Validator<UpdateBody<any>> {
    return (key, schema, obj) => {
        const { set, remove } = obj;
        const isRequired = schema.required || schema.primary || schema.sort || false;
        if (!isRequired) {
            // Then user can remove all he wants.
            return undefined;
        }

        if ((set && set[key] == null ) || // If it's in set
            (remove && remove.indexOf(key) >= 0)) { // or in remove
                // Then we don't want it changing.
                return `Key "${key}" is required and can not be removed.`;
        }
    };
}