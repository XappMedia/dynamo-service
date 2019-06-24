import { buildNormalSchemaTests } from "../../Normal/__test__/NormalSchemaBuilder.test";
import BooleanSchemaBuilder, { DynamoBooleanSchema } from "../BooleanSchemaBuilder";

function booleanSchemaBuilder(key: string, schema: DynamoBooleanSchema) {
    return new BooleanSchemaBuilder(key, { ...schema, type: "BOOL" });
}

describe(BooleanSchemaBuilder.name, () => {
    buildNormalSchemaTests<BooleanSchemaBuilder, boolean>({
        valueType: "boolean",
        schemaBuilder: booleanSchemaBuilder
    });
});