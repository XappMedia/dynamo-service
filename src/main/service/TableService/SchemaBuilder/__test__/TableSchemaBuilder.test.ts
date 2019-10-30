/**
 * Copyright 2019 XAPPmedia
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import * as Chai from "chai";
import { TableSchema } from "../../../KeySchema";
import * as Builder from "../TableSchemaBuilder";

const expect = Chai.expect;

function buildTableSchema(partialSchema: TableSchema<any>): TableSchema<any> {
    return {
        "primaryKey": {
            type: "S",
            primary: true
        },
        ...partialSchema,
    };
}

describe(Builder.TableSchemaBuilder.name, () => {
    describe(Builder.TableSchemaBuilder.prototype.convertObjectFromSchema.name, () => {
        it("Date object is converted from the dynamo database.", () => {
            const schema = buildTableSchema({ "dateParam": { type: "Date" }});
            const builder = new Builder.TableSchemaBuilder(schema);
            const expectedDate = new Date();
            const obj = builder.convertObjectFromSchema({
                "primaryKey": "TestKey",
                "dateParam": expectedDate.toISOString()
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey", "dateParam": expectedDate });
        });

        it("Ignores a slugged string returning from dynamo.", () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", slugify: true }});
            const builder = new Builder.TableSchemaBuilder(schema);
            const obj = builder.convertObjectFromSchema({
                "primaryKey": "TestKey",
                "stringParam": "a-slugged-key"
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey", "stringParam": "a-slugged-key" });

            // Test an object that was inserted before the restriction was in place.
            const obj2 = builder.convertObjectFromSchema({
                "primaryKey": "TestKey",
                "stringParam": "ABC!@#$_+=-"
            });
            expect(obj2).to.deep.equal({ "primaryKey": "TestKey", "stringParam": "ABC!@#$_+=-" });
        });

        it("Removes columns that match the regex pattern.", () => {
            const schema = buildTableSchema({});
            const builder = new Builder.TableSchemaBuilder(schema, { trimColumnsInGet: /^AWS:.+$/g });
            const obj = builder.convertObjectFromSchema({
                "primaryKey": "TestKey",
                "columnWeWant": "ValueWeWant",
                "AWS:column": "Something"
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey", "columnWeWant": "ValueWeWant" });
        });

        it("Removes columns that match the regex patterns if they are an array.", () => {
            const schema = buildTableSchema({});
            const builder = new Builder.TableSchemaBuilder(schema, { trimColumnsInGet: [/^AWS:.+$/g, /^SPECIAL:.+$/g] });
            const obj = builder.convertObjectFromSchema({
                "primaryKey": "TestKey",
                "columnWeWant": "ValueWeWant",
                "AWS:column": "Something",
                "SPECIAL:column": "Something else"
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey", "columnWeWant": "ValueWeWant" });
        });
    });

    describe(Builder.TableSchemaBuilder.prototype.convertObjectToSchema.name, () => {
        it("Date object is convert to the dynamo database object.", () => {
            const schema = buildTableSchema({ "dateParam": { type: "Date" }});
            const builder = new Builder.TableSchemaBuilder(schema);
            const expectedDate = new Date().toISOString();
            const obj = builder.convertObjectToSchema({
                "primaryKey": "TestKey",
                "dateParam": new Date(expectedDate)
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey", "dateParam": expectedDate });
        });

        it("Tests that a string is slugged going in to the database.", () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", slugify: true }});
            const builder = new Builder.TableSchemaBuilder(schema);
            const obj = builder.convertObjectToSchema({
                "primaryKey": "TestKey",
                "stringParam": "A Key To Be Slugged"
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey", "stringParam": "A-Key-To-Be-Slugged" });
        });

        it("Tests that unknown parameters are retained if the trimUnknown is false.", () => {
            const schema = buildTableSchema({ });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: false });
            const obj = builder.convertObjectToSchema({
                "primaryKey": "TestKey",
                "stringParam": "An unknown parameter"
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey", "stringParam": "An unknown parameter" });
        });

        it("Tests that unknown parameters are removed if the trimUnknown flag is true.", () => {
            const schema = buildTableSchema({ });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: true });
            const obj = builder.convertObjectToSchema({
                "primaryKey": "TestKey",
                "stringParam": "An unknown parameter"
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey" });
        });

        it("Tests that nested parameters are retained if the trimUnknown flag is true.", () => {
            const schema = buildTableSchema({
                mapParam: {
                    type: "M",
                    attributes: {
                        param1: {
                            type: "S"
                        },
                        param2: {
                            type: "S"
                        }
                    }
                }
             });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: true });
            const obj = builder.convertObjectToSchema({
                "primaryKey": "TestKey",
                "mapParam.param1": "Test",
                "unknownMapParam.param1": "Test"
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey", "mapParam.param1": "Test" });
        });

        it("Tests that constant parameters are *not* removed if the trimConstants flag is true.", () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", constant: true } });
            const builder = new Builder.TableSchemaBuilder(schema, { trimConstants: true });
            const obj = builder.convertObjectToSchema({
                "primaryKey": "TestKey",
                "stringParam": "A constant parameter"
            });
            expect(obj).to.deep.equal({ "primaryKey": "TestKey", "stringParam": "A constant parameter" });
        });
    });

    describe(Builder.TableSchemaBuilder.prototype.convertUpdateObjectToSchema.name, () => {
        it("Date object is converted to the dynamo database object.", () => {
            const schema = buildTableSchema({ "dateParam": { type: "Date" }});
            const builder = new Builder.TableSchemaBuilder(schema);
            const expectedDate = new Date().toISOString();
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "dateParam": new Date(expectedDate)
                }
            });
            expect(obj).to.deep.equal({ set: { "dateParam": expectedDate }});
        });

        it("Tests that the set object is left alone if the trimUnknown flag is set to false.", () => {
            const schema = buildTableSchema({ });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: false });
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "stringParam": "Unknown parameter"
                }
            });
            expect(obj).to.deep.equal({ set: { "stringParam": "Unknown parameter" }});
        });

        it("Tests that the append object is trimmed if the trimUnknown flag is set to false.", () => {
            const schema = buildTableSchema({ });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: false });
            const obj = builder.convertUpdateObjectToSchema({
                append: {
                    "stringParam": ["Unknown parameter"]
                }
            });
            expect(obj).to.deep.equal({ append: { "stringParam": ["Unknown parameter"] }});
        });

        it("Tests that the set object is not trimmed if the trimUnknown flag is set to true but setting a specific item in the array.", () => {
            const schema = buildTableSchema({
                "listParam": {
                    type: "L"
                }
             });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: true });
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "listParam[0]": "Known parameter"
                }
            });
            expect(obj).to.deep.equal({ set: { "listParam[0]": "Known parameter" }});
        });

        it("Tests that the set object is not trimmed if the trimUnknown flag is set to true but setting a specific item in the array of a nested object.", () => {
            const schema = buildTableSchema({
                "mapParam": {
                    type: "M",
                    attributes: {
                        "listParam": {
                            type: "L"
                        }
                    }
                }
             });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: true });
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "mapParam.listParam[0]": "Known parameter"
                }
            });
            expect(obj).to.deep.equal({ set: { "mapParam.listParam[0]": "Known parameter" }});
        });

        it("Tests that the set object is trimmed if the trimUnknown flag is set to true but setting a specific item in the array.", () => {
            const schema = buildTableSchema({});
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: true });
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "listParam[0]": "Unknown parameter"
                }
            });
            expect(obj).to.deep.equal({ set: { }});
        });

        it("Tests that the set object is trimmed if the trimUnknown flag is set to true but setting a specific item in the array of a nested unknown object.", () => {
            const schema = buildTableSchema({});
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: true });
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "mapParam.listParam[0]": "Unknown parameter"
                }
            });
            expect(obj).to.deep.equal({ set: { }});
        });

        it("Tests that the set object is trimmed if the trimUnknown flag is set to true.", () => {
            const schema = buildTableSchema({ });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: true });
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "stringParam": "Unknown parameter"
                }
            });
            expect(obj).to.deep.equal({ set: { }});
        });

        it("Tests that the append object is trimmed if the trimUnknown flag is set to true.", () => {
            const schema = buildTableSchema({ });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: true });
            const obj = builder.convertUpdateObjectToSchema({
                append: {
                    "stringParam": ["Unknown parameter"]
                }
            });
            expect(obj).to.deep.equal({ append: { }});
        });

        it("Tests that nested items in the set object are retained if the trimUnknown flag is set to true.", () => {
            const schema = buildTableSchema({
                mapParam: {
                    type: "M",
                    attributes: {
                        param1: {
                            type: "S"
                        },
                        param2: {
                            type: "S"
                        }
                    }
                }
             });
            const builder = new Builder.TableSchemaBuilder(schema, { trimUnknown: true });
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "mapParam.param1": "Test",
                    "unknownMapParam.param1": "Test"
                }
            });
            expect(obj).to.deep.equal({ set: { "mapParam.param1": "Test" } });
        });

        it("Tests that constant parameters are not removed from the set object if the trimConstants flag is true.", () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", constant: true } });
            const builder = new Builder.TableSchemaBuilder(schema, { trimConstants: false });
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "stringParam": "A constant parameter"
                }
            });
            expect(obj).to.deep.equal({ set: { "stringParam": "A constant parameter" } });
        });

        it("Tests that constant parameters are not removed from the append object if the trimConstants flag is true.", () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", constant: true } });
            const builder = new Builder.TableSchemaBuilder(schema, { trimConstants: false });
            const obj = builder.convertUpdateObjectToSchema({
                append: {
                    "stringParam": "A constant parameter"
                }
            });
            expect(obj).to.deep.equal({ append: { "stringParam": "A constant parameter" } });
        });

        it("Tests that constant parameters are removed from the set object if the trimConstants flag is true.", () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", constant: true } });
            const builder = new Builder.TableSchemaBuilder(schema, { trimConstants: true });
            const obj = builder.convertUpdateObjectToSchema({
                set: {
                    "stringParam": "A constant parameter"
                }
            });
            expect(obj).to.deep.equal({ set: { } });
        });

        it("Tests that constant parameters are removed from the append object if the trimConstants flag is true.", () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", constant: true } });
            const builder = new Builder.TableSchemaBuilder(schema, { trimConstants: true });
            const obj = builder.convertUpdateObjectToSchema({
                append: {
                    "stringParam": "A constant parameter"
                }
            });
            expect(obj).to.deep.equal({ append: { } });
        });
    });

    describe(Builder.TableSchemaBuilder.prototype.validateObjectAgainstSchema.name, () => {
        it("Returns an error if the date object is not a valid date.", () => {
            const schema = buildTableSchema({ "dateParam": { type: "Date" }});
            const builder = new Builder.TableSchemaBuilder(schema);
            const errors = builder.validateObjectAgainstSchema({
                "primaryKey": "TestKey",
                "dateParam": "This is not a valid date object."
            });
            expect(errors).to.include.members(["Key \"dateParam\" is not a valid date."]);
        });

        it("Returns multiple errors if multiple things wrong with the object.", () => {
            const schema = buildTableSchema({ "dateParam": { type: "Date" }});
            const builder = new Builder.TableSchemaBuilder(schema);
            const errors = builder.validateObjectAgainstSchema({
                "dateParam": "This is not a valid date object."
            });
            expect(errors).to.include.members([
                "Key \"dateParam\" is not a valid date.",
                "Key \"primaryKey\" is required but is not defined."
            ]);
        });
    });

    describe(Builder.TableSchemaBuilder.prototype.validateUpdateObjectAgainstSchema.name, () => {
        it("Returns an error if the date object is not a valid date.", () => {
            const schema = buildTableSchema({ "dateParam": { type: "Date" }});
            const builder = new Builder.TableSchemaBuilder(schema);
            const errors = builder.validateUpdateObjectAgainstSchema({
                set: {
                    "dateParam": "This is not a valid date object."
                }
            });
            expect(errors).to.include.members(["Key \"dateParam\" is not a valid date."]);
        });

        it("Returns multiple errors if multiple things wrong with the object.", () => {
            const schema = buildTableSchema({ "dateParam": { type: "Date" }});
            const builder = new Builder.TableSchemaBuilder(schema);
            const errors = builder.validateUpdateObjectAgainstSchema({
                set: {
                    "primaryKey": "ToSomethingElse",
                    "dateParam": "This is not a valid date object."
                }
            });
            expect(errors).to.include.members([
                "Key \"dateParam\" is not a valid date.",
                "Key \"primaryKey\" is constant and can not be modified."
            ]);
        });
    });
});