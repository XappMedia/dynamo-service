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
import { SchemaType } from "../../../KeySchema";

import BooleanSchemaBuilder from "../Boolean/BooleanSchemaBuilder";
import DateSchemaBuilder from "../Date/DateSchemaBuilder";
import ListSchemaBuilder from "../List/ListSchemaBuilder";
import MapSchemaBuilder from "../Map/MapSchemaBuilder";
import MultiTypeSchemaBuilder from "../MultiType/MultiTypeSchemaBuilder";
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
            },
            "Multiple": {
                expectedBuilderClass: MultiTypeSchemaBuilder
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