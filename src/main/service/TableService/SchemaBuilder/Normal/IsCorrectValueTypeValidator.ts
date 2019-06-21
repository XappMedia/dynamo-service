import { UpdateBody } from "./NormalSchemaBuilder";
import { Validator } from "./Validator";

export function isCorrectValueTypeValidator(expectedType: string): Validator<any> {
    return (key, schema, obj) => {
        if (typeof obj !== expectedType) {
            return `Key "${key}" is expected to be of type ${expectedType} but got ${typeof obj}.`;
        }
    };
}

export function isCorrectValueTypeUpdateBodyValidator(expectedType: string): Validator<UpdateBody<any>> {
    return (key, schema, obj) => {
        const { set } = obj;
        if (set && set[key] && typeof set[key] !== expectedType) {
            return `Key "${key}" is expected to be of type ${expectedType} but got ${typeof set[key]}.`;
        }
    };
}