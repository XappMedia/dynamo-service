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

import * as Validator from "../IsRequiredValidator";

// tslint:disable:no-null-keyword
describe("IsRequiredValidator", () => {
    describe(Validator.isRequiredPutObjectValidator.name, () => {
        it("Returns no error is returned if the object is not required.", () => {
            const schema: NormalSchema = {
                type: "S"
            };
            const validator = Validator.isRequiredPutObjectValidator();
            expectToHaveNoErrors(validator("TestParam", schema, undefined));
        });

        it("Returns errors if the object is undefined but it is required.", () => {
            const schema: NormalSchema = {
                type: "S",
                required: true
            };
            const validator = Validator.isRequiredPutObjectValidator();
            expectToHaveErrors(validator("TestParam", schema, undefined), "Key \"TestParam\" is required but is not defined.");
        });

        it("Returns errors if the object is null but it is required.", () => {
            const schema: NormalSchema = {
                type: "S",
                required: true
            };
            const validator = Validator.isRequiredPutObjectValidator();
            expectToHaveErrors(validator("TestParam", schema, null ), "Key \"TestParam\" is required but is not defined.");
        });
    });

    describe(Validator.isRequiredUpdateBodyValidator.name, () => {
        it("Returns no error is returned if the object is undefined in the set object but is not required.", () => {
            const schema: NormalSchema = {
                type: "S"
            };
            const validator = Validator.isRequiredUpdateBodyValidator();
            expectToHaveNoErrors(validator("TestParam", schema, {
                set: {
                    "TestParam": undefined
                }
            }));
        });

        it("Returns no error is returned if the object is listed in the remove object but is not required.", () => {
            const schema: NormalSchema = {
                type: "S"
            };
            const validator = Validator.isRequiredUpdateBodyValidator();
            expectToHaveNoErrors(validator("TestParam", schema, {
                remove: ["TestParam"]
            }));
        });

        it("Returns errors if the object is undefined in the set object but it is required.", () => {
            const schema: NormalSchema = {
                type: "S",
                required: true
            };
            const validator = Validator.isRequiredUpdateBodyValidator();
            expectToHaveErrors(validator("TestParam", schema, {
                set: {
                    "TestParam": undefined
                }
            }), "Key \"TestParam\" is required and can not be removed.");
        });

        it("Returns errors if the object is listed in the remove object but it is required.", () => {
            const schema: NormalSchema = {
                type: "S",
                required: true
            };
            const validator = Validator.isRequiredUpdateBodyValidator();
            expectToHaveErrors(validator("TestParam", schema, {
                remove: ["TestParam"]
            }), "Key \"TestParam\" is required and can not be removed.");
        });

        it("Returns no error if the set object does not contain the parameter.", () => {
            const schema: NormalSchema = {
                type: "S",
                required: true
            };
            const validator = Validator.isRequiredUpdateBodyValidator();
            expectToHaveNoErrors(validator("TestParam", schema, {
                set: {
                    "Some other param.": undefined
                }
            }));
        });

        it("Returns no error if the remove object does not contain the parameter.", () => {
            const schema: NormalSchema = {
                type: "S",
                required: true
            };
            const validator = Validator.isRequiredUpdateBodyValidator();
            expectToHaveNoErrors(validator("TestParam", schema, {
                remove: ["Some other parameter"]
            }));
        });
    });
});