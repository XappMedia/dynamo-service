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