import { UpdateBody } from "./NormalSchemaBuilder";
import { Validator } from "./Validator";

// tslint:disable:no-null-keyword != null checks for both undefined and null
export function isRequiredPutObjectValidator(): Validator<any> {
    return (key, schema, obj) => {
        if (isRequired(schema)) {
            if (!!obj && obj[key] == null) {
                return `Key "${key}" is required but is not defined.`;
            }
        }
    };
}

export function isRequiredUpdateBodyValidator(): Validator<UpdateBody<any>> {
    return (key, schema, obj) => {
        const { set, remove } = obj;
        if (!isRequired(schema)) {
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

function isRequired(schema: { required?: boolean, primary?: boolean, sort?: boolean }) {
    return schema.required || schema.primary || schema.sort || false;
}