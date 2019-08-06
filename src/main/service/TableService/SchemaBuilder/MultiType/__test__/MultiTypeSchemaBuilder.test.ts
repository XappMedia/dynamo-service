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
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import { Converter } from "../../../../KeySchema";
import { expectToHaveErrors, expectToHaveNoErrors } from "../../__test__/ValidatorTestUtils";
import NumberBuilder from "../../Number/NumberSchemaBuilder";
import StringBuilder from "../../String/StringSchemaBuilder";
import * as Builder from "../MultiTypeSchemaBuilder";

Chai.use(SinonChai);
const expect = Chai.expect;

describe(Builder.MultiTypeSchema.name, () => {
    describe(Builder.MultiTypeSchema.prototype.convertObjectFromJavascript.name, () => {

        before(() => {
            Sinon.spy(StringBuilder.prototype, "convertObjectFromJavascript");
            Sinon.spy(NumberBuilder.prototype, "convertObjectFromJavascript");
        });

        after(() => {
            (StringBuilder.prototype.convertObjectFromJavascript as Sinon.SinonSpy).restore();
            (NumberBuilder.prototype.convertObjectFromJavascript as Sinon.SinonSpy).restore();
        });

        it("Tests that a schema of String does not do the conversion", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": {},
                    "S": {
                        slugify: true
                    }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const obj = builder.convertObjectFromJavascript({
                "TestParam": "testString"
            });
            expect(obj).to.deep.equal({
                "TestParam": "testString"
            });

            expect(StringBuilder.prototype.convertObjectFromJavascript).to.have.been.calledWithMatch({
                "TestParam": "testString"
            });
            expect(NumberBuilder.prototype.convertObjectFromJavascript).to.not.have.been.called;
        });
    });

    describe(Builder.MultiTypeSchema.prototype.convertObjectToJavascript.name, () => {

        before(() => {
            Sinon.spy(StringBuilder.prototype, "convertObjectToJavascript");
            Sinon.spy(NumberBuilder.prototype, "convertObjectToJavascript");
        });

        after(() => {
            (StringBuilder.prototype.convertObjectToJavascript as Sinon.SinonSpy).restore();
            (NumberBuilder.prototype.convertObjectToJavascript as Sinon.SinonSpy).restore();
        });

        it("Tests that a schema of String does not do the conversion", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": {},
                    "S": {
                        slugify: true
                    }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const obj = builder.convertObjectToJavascript({
                "TestParam": "testString"
            });
            expect(obj).to.deep.equal({
                "TestParam": "testString"
            });

            expect(StringBuilder.prototype.convertObjectToJavascript).to.have.been.calledWithMatch({
                "TestParam": "testString"
            });
            expect(NumberBuilder.prototype.convertObjectToJavascript).to.not.have.been.called;
        });
    });

    describe(Builder.MultiTypeSchema.prototype.convertObjectToSchema.name, () => {
        it("Throws an error if the type is not provided.", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": {},
                    "S": {}
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            let caughtError: Error;
            try {
                builder.convertObjectToSchema({
                    "TestParam": true
                });
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.exist;
            expect(caughtError.message).to.equal('Type boolean is not supported for key "TestParam".');
        });

        it("Does nothing to objects that are undefined.", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": {},
                    "S": {}
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const obj = builder.convertObjectToSchema(undefined);
            expect(obj).to.equal(undefined);
        });

        it("Does nothing to objects that don't have the parameter.", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": {},
                    "S": {}
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const obj = builder.convertObjectToSchema({
                "AnotherParam": "Something Else"
            });
            expect(obj).to.deep.equal({
                "AnotherParam": "Something Else"
            });
        });

        it("Tests that the processor is run for the schema that the item is.", () => {
            const stringProcessor = Sinon.stub().callsFake((item) => item + "-append");
            const numberProcessor = Sinon.stub().callsFake((item) => item + 1);
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": {
                        process: numberProcessor
                    },
                    "S": {
                        process: stringProcessor
                    }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const numberObj1 = builder.convertObjectToSchema({
                "TestParam": 4
            });
            const stringObj1 = builder.convertObjectToSchema({
                "TestParam": "TestValue"
            });

            expect(numberObj1).to.deep.equal({ "TestParam": 5 });
            expect(stringObj1).to.deep.equal({ "TestParam": "TestValue-append" });
        });
    });

    describe(Builder.MultiTypeSchema.prototype.convertObjectFromSchema.name, () => {
        it("Tests that the processor is run for the type it is in the database.", () => {
            const numberConverter: Converter<number, number> = {
                toObj: Sinon.stub().callsFake((item) => item),
                fromObj: Sinon.stub().callsFake((item) => item - 1)
            };

            const stringConverter: Converter<string, string> = {
                toObj: Sinon.stub().callsFake((item) => item),
                fromObj: Sinon.stub().callsFake((item) => item + "-append")
            };
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": {
                        process: numberConverter
                    },
                    "S": {
                        process: stringConverter
                    }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const numberObj1 = builder.convertObjectFromSchema({
                "TestParam": 4
            });
            const stringObj1 = builder.convertObjectFromSchema({
                "TestParam": "TestValue"
            });
            expect(numberObj1).to.deep.equal({ "TestParam": 3 });
            expect(stringObj1).to.deep.equal({ "TestParam": "TestValue-append" });
        });
    });

    describe(Builder.MultiTypeSchema.prototype.convertUpdateObjectToSchema.name, () => {
        it("Tests that the processor is run for the type it is in the database.", () => {
            const numberConverter: Converter<number, number> = {
                toObj: Sinon.stub().callsFake((item) => item + 1),
                fromObj: Sinon.stub().callsFake((item) => item)
            };

            const stringConverter: Converter<string, string> = {
                toObj: Sinon.stub().callsFake((item) => item + "-append"),
                fromObj: Sinon.stub().callsFake((item) => item)
            };
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": {
                        process: numberConverter
                    },
                    "S": {
                        process: stringConverter
                    }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const numberObj1 = builder.convertUpdateObjectToSchema({
                set: {
                    "TestParam": 4
                }
            });
            const stringObj1 = builder.convertUpdateObjectToSchema({
                set: {
                    "TestParam": "TestValue"
                }
            });
            expect(numberObj1).to.deep.equal({ set: { "TestParam": 5 } });
            expect(stringObj1).to.deep.equal({ set: { "TestParam": "TestValue-append" } });
        });
    });

    describe(Builder.MultiTypeSchema.prototype.validateUpdateObjectAgainstSchema.name, () => {
        it("Tests that the validator is run against the appropriate one.", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": { },
                    "S": {
                        invalidCharacters: ":"
                    }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const numberErrors = builder.validateUpdateObjectAgainstSchema({ set: { "TestParam": 4 } });
            const stringErrors = builder.validateUpdateObjectAgainstSchema({ set: { "TestParam": "Test:Value" }});

            expectToHaveNoErrors(numberErrors);
            expectToHaveErrors(stringErrors, "Key \"TestParam\" contains invalid characters \":\".");
        });

        it("Tests that the validator returns an error if the user is removing a constant item.", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                constant: true,
                schemas: {
                    "N": { },
                    "S": { }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const errors = builder.validateUpdateObjectAgainstSchema({ remove: ["TestParam"] });
            expectToHaveErrors(errors, "Key \"TestParam\" is constant and can not be modified.");
        });

        it("Tests that the validator returns an error if trying to append to a list that is not a list.", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": { },
                    "S": { }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const errors = builder.validateUpdateObjectAgainstSchema({ append: { "TestParam": ["Value"] }});
            expectToHaveErrors(errors, 'Key "TestParam" is not of type List.');
        });

        it("Tests that the list builder is returned if one of the items is a list and appending.",  () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": { },
                    "S": { },
                    "L": { }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const errors = builder.validateUpdateObjectAgainstSchema({ append: { "TestParam": ["Value"] }});
            expectToHaveNoErrors(errors);
        });
    });

    describe(Builder.MultiTypeSchema.prototype.validateObjectAgainstSchema.name, () => {
        it("Tests that the validator is sent to the appropriate one.", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": { },
                    "S": {
                        invalidCharacters: ":"
                    }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const numberErrors = builder.validateObjectAgainstSchema({  "TestParam": 4 });
            const stringErrors = builder.validateObjectAgainstSchema({ "TestParam": "Test:Value" });

            expectToHaveNoErrors(numberErrors);
            expectToHaveErrors(stringErrors, "Key \"TestParam\" contains invalid characters \":\".");
        });

        it("Tests that an error is returned if the value is a type that's not supported.", () => {
            const schema: Builder.MultiSchema = {
                type: "Multiple",
                schemas: {
                    "N": { },
                    "S": {
                        invalidCharacters: ":"
                    }
                }
            };
            const builder = new Builder.MultiTypeSchema("TestParam", schema);
            const errors = builder.validateObjectAgainstSchema({  "TestParam": true });
            expectToHaveErrors(errors, 'Type boolean is not supported for key "TestParam".');
        });
    });
});