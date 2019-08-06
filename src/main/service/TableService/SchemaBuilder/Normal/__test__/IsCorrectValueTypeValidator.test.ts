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

import { expectToHaveErrors, expectToHaveNoErrors } from "../../__test__/ValidatorTestUtils";
import { NormalSchema } from "../NormalSchemaBuilder";

import * as Validator from "../IsCorrectValueTypeValidator";

describe("IsCorrectValueTypeValidator.", () => {
    describe(Validator.isCorrectValueTypeValidator.name, () => {
        it("Tests that no error is returned if the object is the correct type.", () => {
            const obj = "TestObj";

            const schema: NormalSchema = {
                type: "S"
            };

            const validator = Validator.isCorrectValueTypeValidator(typeof obj);
            expectToHaveNoErrors(validator("TestKey", schema, obj));
        });

        it("Tests that an error is returned if the object is not the correct type.", () => {
            const schema: NormalSchema = {
                type: "S"
            };

            const validator = Validator.isCorrectValueTypeValidator("string");
            expectToHaveErrors(validator("TestKey", schema, 4), "Key \"TestKey\" is expected to be of type string but got number.");
        });

        it("Tests that no error is thrown if the object is undefined.", () => {
            const schema: NormalSchema = {
                type: "S"
            };

            const validator = Validator.isCorrectValueTypeValidator("string");
            expectToHaveNoErrors(validator("TestKey", schema, undefined));
        });
    });

    describe(Validator.isCorrectValueTypeUpdateBodyValidator.name, () => {
        it("Tests that no error is returned if the object is the correct type in set.", () => {
            const obj = "TestObj";

            const schema: NormalSchema = {
                type: "S"
            };

            const validator = Validator.isCorrectValueTypeUpdateBodyValidator(typeof obj);
            expectToHaveNoErrors(validator("TestKey", schema, {
                set: {
                    "TestKey": obj
                }
            }));
        });

        it("Tests that an error is returned if the object is not the correct type in set.", () => {
            const schema: NormalSchema = {
                type: "S"
            };

            const validator = Validator.isCorrectValueTypeUpdateBodyValidator("string");
            expectToHaveErrors(validator("TestKey", schema, {
                set: {
                    "TestKey": 4
                }
            }), "Key \"TestKey\" is expected to be of type string but got number.");
        });
    });
});