import { KeySchema, MapSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";
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
            this.addUpdateBodyValidator((key, schema, body) => attributesValidator()(key, schema, (body.set) ? body.set[this.key] : undefined));
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