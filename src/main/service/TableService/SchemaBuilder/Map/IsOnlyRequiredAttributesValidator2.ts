import { MapMapAttribute, MapSchema } from "../../../KeySchema";
import { UpdateBody } from "../Normal/NormalSchemaBuilder";
import { Validator } from "../Normal/Validator";

export function isOnlyRequiredAttributesObjectValidator(): Validator<any, MapMapAttribute | MapSchema> {
    return (key, schema, obj) => {
        const { onlyAllowDefinedAttributes, attributes } = schema;
        if (obj && onlyAllowDefinedAttributes && attributes) {
            const unknownKeys = getUnKnownKeys(obj, attributes);
            if (unknownKeys.length > 0) {
                return `Map attribute "${key}" has forbidden keys "${unknownKeys.join(", ")}".`;
            }
        }
        return undefined;
    };
}

export function isOnlyRequiredAttributesUpdateObjectValidator(): Validator<UpdateBody<any>, MapMapAttribute | MapSchema> {
    return (key, schema, obj) => {
        const { onlyAllowDefinedAttributes, attributes } = schema;
        const { set } = obj;
        if (set && set[key] && onlyAllowDefinedAttributes && attributes) {
            const unknownKeys = getUnKnownKeys(set[key], attributes);
            if (unknownKeys.length > 0) {
                return `Map attribute "${key}" has forbidden keys "${unknownKeys.join(", ")}".`;
            }
        }
        return undefined;
    };
}

function getUnKnownKeys(obj: object, attributes: object): string[] {
    const allKeys = Object.keys(obj);
    const knownKeys = Object.keys(attributes);
    return allKeys.filter((k) => knownKeys.indexOf(k) < 0);
}