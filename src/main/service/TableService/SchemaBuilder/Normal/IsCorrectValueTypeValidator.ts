import { UpdateBody } from "./NormalSchemaBuilder";
import { Validator } from "./Validator";

// tslint:disable:no-null-keyword
export function isCorrectValueTypeValidator(expectedType: string): Validator<any> {
    return (key, schema, obj) => {
        if (obj != null && typeof obj !== expectedType) {
            return `Key "${key}" is expected to be of type ${expectedType} but got ${typeof obj}.`;
        }
    };
}

export function isCorrectValueTypeUpdateBodyValidator(expectedType: string): Validator<UpdateBody<any>> {
    return (key, schema, obj) => {
        const { set } = obj;
        if (set && set[key] != null && typeof set[key] !== expectedType) {
            return `Key "${key}" is expected to be of type ${expectedType} but got ${typeof set[key]}.`;
        }
    };
}