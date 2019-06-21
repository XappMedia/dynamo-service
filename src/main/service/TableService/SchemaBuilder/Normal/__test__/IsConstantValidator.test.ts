import { expectToHaveErrors, expectToHaveNoErrors } from "../../__test__/ValidatorTestUtils";
import * as Validator from "../IsConstantValidator";
import { NormalSchema } from "../NormalSchemaBuilder";

describe("IsConstantValidator", () => {
    describe(Validator.isConstantUpdateBodyValidator.name, () => {
        it("Does not return an error if object is valid.", () => {
            const updateObj = {
                set: {
                    param1: "Test"
                },
                append: {
                    param2: ["Test2"]
                },
                remove: ["param3"]
            };
            const schema: NormalSchema = {
                type: "Anything",
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            expectToHaveNoErrors(validator("param1", schema, updateObj));
            expectToHaveNoErrors(validator("param2", schema, updateObj));
            expectToHaveNoErrors(validator("param3", schema, updateObj));
        });

        it("Returns an error if setting a constant parameter.", () => {
            const updateObj = {
                set: {
                    param1: "Test"
                }
            };
            const schema: NormalSchema = {
                type: "Anything",
                constant: true
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            const returnedErrors = validator("param1", schema, updateObj);
            expectToHaveErrors(returnedErrors, "Key \"param1\" is constant and can not be modified.");
        });

        it("Returns an error if appending to a constant parameter.", () => {
            const updateObj = {
                append: {
                    param1: "Test"
                }
            };
            const schema: NormalSchema = {
                type: "Anything",
                constant: true
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            const returnedErrors = validator("param1", schema, updateObj);
            expectToHaveErrors(returnedErrors, "Key \"param1\" is constant and can not be modified.");
        });

        it("Returns an error if removing a constant parameter.", () => {
            const updateObj = {
                remove: ["param1"]
            };
            const schema: NormalSchema = {
                type: "Anything",
                constant: true
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            const returnedErrors = validator("param1", schema, updateObj);
            expectToHaveErrors(returnedErrors, "Key \"param1\" is constant and can not be modified.");
        });


        it("Returns an error if setting a primary parameter.", () => {
            const updateObj = {
                set: {
                    param1: "Test"
                }
            };
            const schema: NormalSchema = {
                type: "Anything",
                primary: true
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            const returnedErrors = validator("param1", schema, updateObj);
            expectToHaveErrors(returnedErrors, "Key \"param1\" is constant and can not be modified.");
        });

        it("Returns an error if appending to a primary parameter.", () => {
            const updateObj = {
                append: {
                    param1: "Test"
                }
            };
            const schema: NormalSchema = {
                type: "Anything",
                primary: true
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            const returnedErrors = validator("param1", schema, updateObj);
            expectToHaveErrors(returnedErrors, "Key \"param1\" is constant and can not be modified.");
        });

        it("Returns an error if removing a primary parameter.", () => {
            const updateObj = {
                remove: ["param1"]
            };
            const schema: NormalSchema = {
                type: "Anything",
                primary: true
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            const returnedErrors = validator("param1", schema, updateObj);
            expectToHaveErrors(returnedErrors, "Key \"param1\" is constant and can not be modified.");
        });

        it("Returns an error if setting a sort parameter.", () => {
            const updateObj = {
                set: {
                    param1: "Test"
                }
            };
            const schema: NormalSchema = {
                type: "Anything",
                sort: true
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            const returnedErrors = validator("param1", schema, updateObj);
            expectToHaveErrors(returnedErrors, "Key \"param1\" is constant and can not be modified.");
        });

        it("Returns an error if appending to a sort parameter.", () => {
            const updateObj = {
                append: {
                    param1: "Test"
                }
            };
            const schema: NormalSchema = {
                type: "Anything",
                sort: true
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            const returnedErrors = validator("param1", schema, updateObj);
            expectToHaveErrors(returnedErrors, "Key \"param1\" is constant and can not be modified.");
        });

        it("Returns an error if removing a sort parameter.", () => {
            const updateObj = {
                remove: ["param1"]
            };
            const schema: NormalSchema = {
                type: "Anything",
                sort: true
            };
            const validator = Validator.isConstantUpdateBodyValidator();
            const returnedErrors = validator("param1", schema, updateObj);
            expectToHaveErrors(returnedErrors, "Key \"param1\" is constant and can not be modified.");
        });
    });
});
