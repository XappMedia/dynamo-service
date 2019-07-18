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