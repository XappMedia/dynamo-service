import { KeySchema, MapSchema } from "../../../KeySchema";
import NormalSchemaBuilder, { UpdateBody } from "../Normal/NormalSchemaBuilder";
import { Validator } from "../Normal/Validator";
import { getSchemaBuilder } from "../SchemaBuilder";
import { isOnlyRequiredAttributesObjectValidator, isOnlyRequiredAttributesUpdateObjectValidator } from "./IsOnlyRequiredAttributesValidator2";

export { MapSchema };

export class MapSchemaBuilder extends NormalSchemaBuilder<MapSchema> {
    constructor(key: string, schema: MapSchema) {
        super(key, schema, "object");

        if (schema.onlyAllowDefinedAttributes) {
            this.addPutValidator(isOnlyRequiredAttributesObjectValidator());
            this.addUpdateBodyValidator(isOnlyRequiredAttributesUpdateObjectValidator());
        }

        if (schema.attributes) {
            this.addPutValidator(attributesValidator());
            this.addUpdateBodyValidator(attributesUpdateValidator());
        }
    }
}

export default MapSchemaBuilder;

function attributesValidator(): Validator<any, MapSchema> {
    return (key, schema, obj) => {
        const { attributes } = schema;
        const errors: string[] = [];
        if (attributes) {
            const attributeKeys = Object.keys(attributes);
            for (const attributeKey of attributeKeys) {
                const attributeSchema = attributes[attributeKey];
                // The map objects are (as of writing this comment) almost identical to the Schema object, so we're going to utilize them.
                let builder = getSchemaBuilder(attributeKey, attributeSchema as KeySchema);
                const foundErrors = builder.validateObjectAgainstSchema(obj);
                errors.push(...(foundErrors || []));
            }
        }
        return errors;
    };
}

function attributesUpdateValidator(): Validator<UpdateBody<any>, MapSchema> {
    const validator: Validator<UpdateBody<any>, MapSchema> = (key, schema, obj) => {
        const { attributes } = schema;
        const errors: string[] = [];
        if (attributes) {
            const attributeKeys = Object.keys(attributes);
            for (const attributeKey of attributeKeys) {
                const attributeSchema = attributes[attributeKey];
                let builder = getSchemaBuilder(attributeKey, attributeSchema as KeySchema);
                const foundErrors = builder.validateUpdateObjectAgainstSchema({
                    set: (obj.set) ? obj.set[key] : undefined,
                    append: (obj.append) ? obj.append[key] : undefined,
                    remove: removeKeyFromBeginning(key, obj.remove)
                });
                errors.push(...(foundErrors || []));
            }
        }
        return errors;
    };

    return validator;
}

function removeKeyFromBeginning(key: string, values: string[]) {
    if (values) {
        return values.map((v) => (v.startsWith(`${key}.`) ? v.substring(`${key}.`.length) : v));
    }
}