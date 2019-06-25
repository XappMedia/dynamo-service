import { buildNormalSchemaTests } from "../../Normal/__test__/NormalSchemaBuilder.test";
import ListSchemaBuilder, { DynamoListSchema } from "../ListSchemaBuilder";

function listSchemaBuilder(key: string, schema: DynamoListSchema<object>) {
    return new ListSchemaBuilder(key, { ...schema, type: "L" });
}

describe(ListSchemaBuilder.name, () => {
    buildNormalSchemaTests<ListSchemaBuilder, object>({
        valueType: "object",
        schemaBuilder: listSchemaBuilder
    });
});