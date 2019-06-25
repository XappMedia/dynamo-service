import { DynamoListSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";

export { DynamoListSchema };

export class ListSchemaBuilder extends NormalSchemaBuilder<DynamoListSchema> {
    constructor(key: string, schema: DynamoListSchema) {
        super(key, schema, "object");
    }
}

export default ListSchemaBuilder;