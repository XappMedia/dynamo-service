import * as Chai from "chai";
import { buildNormalSchemaTests } from "../../Normal/__test__/NormalSchemaBuilder.test";
import DateSchemaBuilder, { DateSchema } from "../DateSchemaBuilder";

const expect = Chai.expect;

function isoSchemaBuilder(key: string, schema: Pick<DateSchema, Exclude<keyof DateSchema, "type">>) {
    return new DateSchemaBuilder(key, {...schema, type: "Date", dateFormat: "ISO-8601" });
}

function timestampSchemaBuilder(key: string, schema: Pick<DateSchema, Exclude<keyof DateSchema, "type">>) {
    return new DateSchemaBuilder(key, {...schema, type: "Date", dateFormat: "Timestamp" });
}

describe("DateSchemaBuilder", () => {
    describe("ISO", () => {
        buildNormalSchemaTests<DateSchemaBuilder, string>({
            valueType: "string",
            schemaBuilder: isoSchemaBuilder,
            makeObjectTests: () => {
                it("Tests that the object is converted to ISO format by default.", () => {
                    const date = new Date();
                    const schema = new DateSchemaBuilder("Test", { type: "Date" });
                    const obj = schema.convertObjectToSchema({ "Test": date });
                    expect(obj).to.deep.equal({ "Test": date.toISOString() });
                });

                it("Tests that the object is converted to ISO format when explicitly told to.", () => {
                    const date = new Date();
                    const schema = new DateSchemaBuilder("Test", { type: "Date", dateFormat: "ISO-8601" });
                    const obj = schema.convertObjectToSchema({ "Test": date });
                    expect(obj).to.deep.equal({ "Test": date.toISOString() });
                });

                it("Tests that the object is processed before the conversion.", () => {
                    // This will pass in a different date than the processor returns.
                    // The object returned should have a TIMESTAMP of the "date". Not the original.
                    const date = new Date(2018, 1, 1);
                    const schema = new DateSchemaBuilder("Test", {
                        type: "Date",
                        dateFormat: "Timestamp",
                        process: () => date
                    });
                    const obj = schema.convertObjectToSchema({ "Test": new Date(2019, 1, 1) });
                    expect(typeof obj["Test"], "The date object was not converted.").to.equal("number");
                    expect(obj["Test"]).to.equal(date.getTime());
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
                    const schema = new DateSchemaBuilder("Test", { type: "Date", dateFormat: "Timestamp" });
                    const obj = schema.convertObjectToSchema({ "Test": date});
                    expect(obj).to.deep.equal({ "Test": date.getTime() });
                });
            }
        });
    });
});