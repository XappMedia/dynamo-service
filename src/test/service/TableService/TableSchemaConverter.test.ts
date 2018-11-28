import * as Chai from "chai";

import * as Schema from "../../../main/service/KeySchema";
import * as Converter from "../../../main/service/TableService/TableSchemaConverter";

const defaultSchema: Schema.TableSchema<any> = {
    primaryKey: {
        primary: true,
        type: "N"
    }
};

const expect = Chai.expect;

describe("TableSchemaConverter", () => {

    describe("ConvertObj", () => {

        it("Tests that an undefined is returned with undefined", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema
            });

            expect(converter.convertObj(undefined)).to.be.undefined;
        });

        it("Tests that an object with no policies is returned.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema
            });
            const obj = {
                primaryKey: 5,
                secondary: 4,
                stringParam: "Value"
            };
            expect(converter.convertObj(obj)).to.deep.equal(obj);
        });

        it("Tests that objects with unknown attributes are trimmed.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema
            });
            const obj = {
                primaryKey: 5,
                secondary: 4,
                stringParam: "Value"
            };
            expect(converter.convertObj(obj, { trimUnknown: true })).to.deep.equal({ primaryKey: 5});
        });

        it("Tests that objects which are constant are trimmed when set.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema,
                secondary: {
                    type: "N",
                    constant: true
                }
            });
            const obj = {
                primaryKey: 5,
                secondary: 4,
            };
            expect(converter.convertObj(obj, { trimConstants: true })).to.deep.equal({ primaryKey: 5 });
        });

        it("Tests that objects are slugged.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema,
                secondary: {
                    type: "S",
                    slugify: true
                }
            });
            const obj = {
                primaryKey: 5,
                secondary: "this is a slugged name"
            };
            expect(converter.convertObj(obj)).to.deep.equal({
                primaryKey: 5,
                secondary: "this-is-a-slugged-name"
            });
        });
    });

    describe("Convert from dynamo object.", () => {
        it("Tests that an undefined is returned as undefined.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema
            });

            expect(converter.convertObjFromDynamo(undefined)).to.be.undefined;
        });

        it("Tests that an item returned from dynamo is returned.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema
            });

            const obj = {
                primaryKey: 5,
                secondary: "This is a new one."
            };
            expect(converter.convertObjFromDynamo(obj)).to.deep.equal(obj);
        });

        it("Tests that unknown properties are trimmed if decided to be trimmed.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema
            });

            const obj = {
                primaryKey: 5,
                secondary: "This should not be seen.",
                tertiary: "This should also not be seen."
            };
            expect(converter.convertObjFromDynamo(obj as any, { trimUnknown: true })).to.deep.equal({ primaryKey: 5 });
        });

        it("Tests that ignored properties are removed if decided to be ignored.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema,
                "test1:secondary": {
                    type: "S"
                },
                "test2:tertiary": {
                    type: "S"
                }
            });

            const obj = {
                primaryKey: 5,
                "test1:secondary": "This should not be seen.",
                "test2:tertiary": "This should also not be seen."
            };
            expect(converter.convertObjFromDynamo(obj as any, { ignoreColumnsInGet: /^test1:.+/ })).to.deep.equal({ primaryKey: 5, "test2:tertiary": "This should also not be seen." });
            expect(converter.convertObjFromDynamo(obj as any, { ignoreColumnsInGet: [/^test1:.+/, /^test2:.+/] })).to.deep.equal({ primaryKey: 5 });
        });

        it("Tests that a date is converted from ISO to Date.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema,
                "dateData": {
                    type: "Date"
                }
            });
            const date = new Date();
            const obj = {
                primaryKey: 5,
                "dateData": date.toISOString()
            };
            expect(converter.convertObjFromDynamo(obj)).to.deep.equal({ primaryKey: 5, dateData: date });
        });
    });

    describe("Convert data to dynamo object.", () => {
        it("Tests that an undefined returns an undefined.", () => {
            const converter = new Converter.TableSchemaConverter({
                ...defaultSchema,
            });
            expect(converter.convertObjToDynamo(undefined)).to.be.undefined;
        });
    });
});