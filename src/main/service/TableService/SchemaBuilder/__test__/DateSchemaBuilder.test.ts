import DateSchemaBuilder, { DateSchema } from "../DateSchemaBuilder";
import { buildNormalSchemaTests } from "./NormalSchemaBuilder.test";

function isoSchemaBuilder(key: string, schema: Pick<DateSchema, Exclude<keyof DateSchema, "type">>) {
    return new DateSchemaBuilder(key, {...schema, type: "Date", dateFormat: "ISO-8601" });
}

function timestampSchemaBuilder(key: string, schema: Pick<DateSchema, Exclude<keyof DateSchema, "type">>) {
    return new DateSchemaBuilder(key, {...schema, type: "Date", dateFormat: "Timestamp" });
}

describe.only("DateSchemaBuilder", () => {
    describe("ISO", () => {
        buildNormalSchemaTests<DateSchemaBuilder, string>({
            valueType: "string",
            schemaBuilder: isoSchemaBuilder
        });
    });

    describe("Timestamp", () => {
        buildNormalSchemaTests<DateSchemaBuilder, string>({
            valueType: "number",
            schemaBuilder: timestampSchemaBuilder
        });
    });
});