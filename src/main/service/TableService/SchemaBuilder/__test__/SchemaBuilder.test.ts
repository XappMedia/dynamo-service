import * as Chai from "chai";
import { SchemaType } from "../../../KeySchema";

import BooleanSchemaBuilder from "../Boolean/BooleanSchemaBuilder";
import DateSchemaBuilder from "../Date/DateSchemaBuilder";
import ListSchemaBuilder from "../List/ListSchemaBuilder";
import MapSchemaBuilder from "../Map/MapSchemaBuilder";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";
import NumberSchemaBuilder from "../Number/NumberSchemaBuilder";
import * as Builder from "../SchemaBuilder";
import StringSchemaBuilder from "../String/StringSchemaBuilder";

const expect = Chai.expect;

describe("SchemaBuilder", () => {
    describe(Builder.getSchemaBuilder.name, () => {
        interface Test {
            expectedBuilderClass: { new(...args: any[]): any };
        }

        type GetSchemaTests = Record<SchemaType, Test>;

        const tests: GetSchemaTests = {
            "BOOL": {
                expectedBuilderClass: BooleanSchemaBuilder
            },
            "Date": {
                expectedBuilderClass: DateSchemaBuilder
            },
            "L": {
                expectedBuilderClass: ListSchemaBuilder
            },
            "M": {
                expectedBuilderClass: MapSchemaBuilder
            },
            "N": {
                expectedBuilderClass: NumberSchemaBuilder
            },
            "S": {
                expectedBuilderClass: StringSchemaBuilder
            }
        };

        for (const type of Object.keys(tests)) {
            const schemaType: SchemaType = type as SchemaType;
            const test = tests[schemaType];
            it(`Type "${type}" returns a ${test.expectedBuilderClass.name}.`, () => {
                expect(Builder.getSchemaBuilder("Whatever", { type: schemaType as any })).to.be.instanceOf(test.expectedBuilderClass);
            });
        }

        it("Returns a generic builder if the type is currently not supported.", () => {
            expect(Builder.getSchemaBuilder("Whatever", { type: "SomethingElse" as any })).to.be.instanceOf(NormalSchemaBuilder);
        });
    });
});