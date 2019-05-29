import * as Chai from "chai";
import DateSchemaBuilder, { DateSchema } from "../DateSchemaBuilder";
import { buildNormalSchemaTests } from "./NormalSchemaBuilder.test";

const expect = Chai.expect;

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
            schemaBuilder: isoSchemaBuilder,
            makeObjectTests: () => {
                it("Tests that the object is converted to ISO format by default.", () => {
                    const date = new Date();
                    const schema = isoSchemaBuilder("Test", { });
                    const obj = schema.convertObjectToSchema({ "Test": date });
                    expect(obj).to.deep.equal({ "Test": date.toISOString() });
                });

                it("Tests that the object is converted to ISO format when explicitly told to.", () => {
                    const date = new Date();
                    const schema = isoSchemaBuilder("Test", { });
                    const obj = schema.convertObjectToSchema({ "Test": date, dateFormat: "ISO-8601" });
                    expect(obj).to.deep.equal({ "Test": date.toISOString() });
                });
            }
        });
    });

    describe("Timestamp", () => {
        buildNormalSchemaTests<DateSchemaBuilder, string>({
            valueType: "number",
            schemaBuilder: timestampSchemaBuilder,
            makeObjectTests: () => {
                it("Tests that the object is converted to Timestamp format when explicitly told to.", () => {
                    const date = new Date();
                    const schema = isoSchemaBuilder("Test", { });
                    const obj = schema.convertObjectToSchema({ "Test": date, dateFormat: "Timestamp" });
                    expect(obj).to.deep.equal({ "Test": date.getTime() });
                });
            }
        });
    });
});