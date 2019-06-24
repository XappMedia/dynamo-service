import { DynamoBooleanSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";

export { DynamoBooleanSchema };

export class BooleanSchemaBuilder extends NormalSchemaBuilder<DynamoBooleanSchema> {
    constructor(key: string, schema: DynamoBooleanSchema) {
        super(key, schema, "boolean");
    }
}

export default BooleanSchemaBuilder;