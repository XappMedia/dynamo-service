import { buildNormalSchemaTests } from "../../Normal/__test__/NormalSchemaBuilder.test";
import NumberSchemaBuilder, { DynamoNumberSchema } from "../NumberSchemaBuilder";

function numberSchemaBuilder(key: string, schema: DynamoNumberSchema) {
    return new NumberSchemaBuilder(key, { ...schema, type: "N" });
}

describe(NumberSchemaBuilder.name, () => {
    buildNormalSchemaTests<NumberSchemaBuilder, number>({
        valueType: "number",
        schemaBuilder: numberSchemaBuilder
    });
});