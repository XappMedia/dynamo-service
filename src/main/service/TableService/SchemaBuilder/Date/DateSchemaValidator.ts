import { DateSchema } from "../../../KeySchema";
import { UpdateBody } from "../Normal/NormalSchemaBuilder";
import { Validator } from "../Normal/Validator";

export function isDateObjValidator(): Validator<any, DateSchema> {
    return (key, schema, obj) => {
        if (isNotDate(obj)) {
            return `Key "${key}" is not a valid date.`;
        }
    };
}

export function isDateObjUpdateBodyValidator(): Validator<UpdateBody<any>, DateSchema> {
    return (key, schema, obj) => {
        const { set } = obj;
        const item = (set) ? set[key] : undefined;
        if (item && isNotDate(item)) {
            return `Key "${key}" is not a valid date.`;
        }
    };
}

function isNotDate(obj: any) {
    return isNaN(new Date(obj).getTime());
}