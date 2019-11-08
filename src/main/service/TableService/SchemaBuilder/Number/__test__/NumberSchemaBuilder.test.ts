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

import { buildNormalSchemaTests, checkForErrors } from "../../Normal/__test__/NormalSchemaBuilder.test";
import NumberSchemaBuilder, { DynamoNumberSchema } from "../NumberSchemaBuilder";

function schemaBuilder(key: string, schema: Pick<DynamoNumberSchema, Exclude<keyof DynamoNumberSchema, "type">>) {
    return new NumberSchemaBuilder(key, { ...schema, type: "N" });
}

describe(NumberSchemaBuilder.name, () => {
    buildNormalSchemaTests<NumberSchemaBuilder, number>({
        valueType: "number",
        schemaBuilder,
        validationTests: () => {
            it("Tests that an error is thrown if the `integer` parameter is true and the value is a float.", () => {
                const schema = schemaBuilder("Test", { integer: true });
                checkForErrors(
                    () => schema.validateObjectAgainstSchema({ "Test": 1.1 }),
                    [`Key "Test" is not an integer.`]);
            });

            it("Tests that an error is thrown if the `integer` parameter is true and the update value is a float.", () => {
                const schema = schemaBuilder("Test", { integer: true });
                checkForErrors(
                    () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": 1.1 }}),
                    [`Key "Test" is not an integer.`]);
            });

            it("Tests that no error is thrown if the `integer` parameter is true and the number is an integer.", () => {
                const schema = schemaBuilder("Test", { integer: true });
                checkForErrors(
                    () => schema.validateObjectAgainstSchema({ "Test": 1 }),
                    []);
            });

            it("Tests that no error is thrown if the `integer` parameter is true and the number is an integer in an update object.", () => {
                const schema = schemaBuilder("Test", { integer: true });
                checkForErrors(
                    () => schema.validateUpdateObjectAgainstSchema({ set: { "Test": 1 }}),
                    []);
            });

            it("Tests that no error is thrown if the `integer` parameter is true and the number is an integer ending with `.0`.", () => {
                const schema = schemaBuilder("Test", { integer: true });
                checkForErrors(
                    () => schema.validateObjectAgainstSchema({ "Test": 1.0 }),
                    []);
            });

            it("Tests that no error is thrown if the `integer` parameter is true and the number is an integer ending with `.0`.", () => {
                const schema = schemaBuilder("Test", { integer: true });
                checkForErrors(
                    () => schema.validateObjectAgainstSchema({ "Test": 1.0 }),
                    []);
            });
        }
    });
});
