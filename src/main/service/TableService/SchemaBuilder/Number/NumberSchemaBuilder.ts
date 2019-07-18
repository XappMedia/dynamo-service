import { DynamoNumberSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";

export { DynamoNumberSchema };

export class NumberSchemaBuilder extends NormalSchemaBuilder<DynamoNumberSchema> {
    constructor(key: string, schema: DynamoNumberSchema) {
        super(key, schema, "number");
    }
}

export default NumberSchemaBuilder;