import * as Chai from "chai";
import { buildNormalSchemaTests, checkForErrors } from "../../Normal/__test__/NormalSchemaBuilder.test";
import StringSchemaBuilder, { DynamoStringSchema } from "../StringSchemaBuilder";

const expect = Chai.expect;

function schemaBuilder(key: string, schema: Pick<DynamoStringSchema, Exclude<keyof DynamoStringSchema, "type">>) {
    return new StringSchemaBuilder(key, {...schema, type: "S" });
}

describe("StringSchemaBuilder", () => {
    buildNormalSchemaTests<StringSchemaBuilder, string>({
        valueType: "string",
        schemaBuilder,
        updateValidationTests: () => {
            it("Tests that an error is thrown if the string does not match the format.", () => {
                const schema = schemaBuilder("Test", { format: /[a-zA-Z ]+/ });
                checkForErrors(
                    () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": "This has a number 1" } }),
                    [`Key "Test" does not match the required format "/[a-zA-Z ]+/".`]);
            });

            it("Tests that no errors are thrown if the string matches the format.", () => {
                const schema = schemaBuilder("Test", { format: /[a-zA-Z ]+/ });
                checkForErrors(
                    () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": "This has no number" } }),
                    []);
            });

            it("Tests that an error is thrown if the string includes characters that are invalidate.", () => {
                const schema = schemaBuilder("Test", { invalidCharacters: ":" });
                checkForErrors(
                    () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": "This has a character :" } }),
                    [`Key "Test" contains invalid characters ":".`]);
            });

            it("Tests that no error is thrown if the string does not include any invalid characters.", () => {
                const schema = schemaBuilder("Test", { invalidCharacters: ":" });
                checkForErrors(
                    () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": "This has no special characters" } }),
                    []);
            });

            it("Tests that an error is thrown if the string does not match an enum value.", () => {
                const schema = schemaBuilder("Test", { enum: ["One", "Two"]});
                checkForErrors(
                    () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": "This has no special characters" } }),
                    [`Key "Test" is not one of the values "One, Two".`]
                );
            });

            it("Tests that no error is thrown if the string is one of the enums.", () => {
                const schema = schemaBuilder("Test", { enum: ["One", "Two"]});
                checkForErrors(
                    () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": "Two" } }),
                    []
                );
            });
        },
        makeObjectTests: () => {
            it("Tests that the string is slugged.", () => {
                const schema = schemaBuilder("Test", { slugify: true });
                const obj = schema.convertObjectToSchema({ "Test": "This is a test value." });
                expect(obj["Test"]).to.equal("This-is-a-test-value.");
            });

            it("Tests that the items are removed from slugged.", () => {
                const schema = schemaBuilder("Test", { slugify: { remove: /[.]/ }});
                const obj = schema.convertObjectToSchema({ "Test": "This is a test value." });
                expect(obj["Test"]).to.equal("This-is-a-test-value");
            });

            it("Tests that the items are replaced if in the charmap.", () => {
                const schema = schemaBuilder("Test", { slugify: { charMap: { ".": "Period" } }});
                const obj = schema.convertObjectToSchema({ "Test": "This is a test value." });
                expect(obj["Test"]).to.equal("This-is-a-test-valuePeriod");
            });

            it("Tests that emojis are removed.", () => {
                const schema = schemaBuilder("Test", { slugify: true });
                const obj = schema.convertObjectToSchema({ "Test": "This 😀 🤩 🙆🏻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙" });
                expect(obj["Test"]).to.equal("This");
            });

            it("Tests that emojis are still removed even after removing other characters.", () => {
                const schema = schemaBuilder("Test", { slugify: { remove: /[.]/ }});
                const obj = schema.convertObjectToSchema({ "Test": "This 😀 🤩 🙆🏻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 ." });
                expect(obj["Test"]).to.equal("This-");
            });
        }
    });
});