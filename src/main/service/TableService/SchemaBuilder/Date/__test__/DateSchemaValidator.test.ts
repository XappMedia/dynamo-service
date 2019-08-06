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

import * as Validator from "../DateSchemaValidator";

describe("DateSchemaValidator", () => {
    describe(Validator.isDateObjValidator.name, () => {
        it("Tests that a valid date does not return an error.", () => {
            const validator = Validator.isDateObjValidator();
            expectToHaveNoErrors(validator("TestKey", undefined, "2018-01-01T00:00:00"));
        });

        it("Tests that an invalid date returns a error.", () => {
            const validator = Validator.isDateObjValidator();
            expectToHaveErrors(validator("TestKey", undefined, "IOVENSONGEOHAOIWHIOAT"), "Key \"TestKey\" is not a valid date.");
        });

        it("Tests that undefined is ignored.", () => {
            const validator = Validator.isDateObjValidator();
            expectToHaveNoErrors(validator("TestKey", undefined, undefined));
        });
    });

    describe(Validator.isDateObjUpdateBodyValidator.name, () => {
        it("Tests that a valid date does not return an error.", () => {
            const validator = Validator.isDateObjUpdateBodyValidator();
            expectToHaveNoErrors(validator("TestKey", undefined, { set: { "TestKey": "2018-01-01T00:00:00"} }));
        });

        it("Tests that an invalid date returns a error.", () => {
            const validator = Validator.isDateObjUpdateBodyValidator();
            expectToHaveErrors(validator("TestKey", undefined, { set: { "TestKey": "IOVENSONGEOHAOIWHIOAT" } }), "Key \"TestKey\" is not a valid date.");
        });

        it("Tests that no error is thrown if the set is not there.", () => {
            const validator = Validator.isDateObjUpdateBodyValidator();
            expectToHaveNoErrors(validator("TestKey", undefined, {}));
        });

        it("Tests that no error is thrown if the date is being set to undefined.", () => {
            const validator = Validator.isDateObjUpdateBodyValidator();
            expectToHaveNoErrors(validator("TestKey", undefined, { set: { "TestKey": undefined } }));
        });
    });
});