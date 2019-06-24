import { MapSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";
import { Validator } from "../Normal/Validator";
import { DynamoStringSchema, StringSchemaBuilder } from "../String/StringSchemaBuilder";
import { isOnlyRequiredAttributesObjectValidator, isOnlyRequiredAttributesUpdateObjectValidator } from "./IsOnlyRequiredAttributesValidator";

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
                switch (attributeSchema.type) {
                    case "S": {
                        const builder = new StringSchemaBuilder(`${attributeKey}`, attributeSchema as DynamoStringSchema);
                        const foundErrors = builder.validateObjectAgainstSchema(obj);
                        errors.push(...(foundErrors || []));
                        break;
                    }
                    case "M": {
                        const builder = new MapSchemaBuilder(`${attributeKey}`, attributeSchema as MapSchema);
                        const foundErrors = builder.validateObjectAgainstSchema(obj);
                        errors.push(...(foundErrors || []));
                        break;
                    }
                    default:
                        throw new Error("not implemented.");
                }
            }
        }
        return errors;
    };
}