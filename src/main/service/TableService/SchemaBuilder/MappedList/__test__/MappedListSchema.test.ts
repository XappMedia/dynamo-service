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
import { buildNormalSchemaTests } from "../../Normal/__test__/NormalSchemaBuilder.test";
import NumberBuilder from "../../Number/NumberSchemaBuilder";
import StringBuilder from "../../String/StringSchemaBuilder";
import Builder, { MappedListSchema } from "../MappedListSchemaBuilder";

Chai.use(SinonChai);
const expect = Chai.expect;

function mappedListSchemaBuilder(key: string, schema: MappedListSchema) {
    return new Builder(key, { ...schema, type: "MappedList" });
}

describe(Builder.name, () => {
    buildNormalSchemaTests<Builder, object>({
        valueType: "object",
        schemaBuilder: mappedListSchemaBuilder,
        convertToSchemaTests: () => {
            before(() => {
                Sinon.spy(StringBuilder.prototype, "convertObjectToJavascript");
                Sinon.spy(NumberBuilder.prototype, "convertObjectToJavascript");
            });

            after(() => {
                (StringBuilder.prototype.convertObjectToJavascript as Sinon.SinonSpy).restore();
                (NumberBuilder.prototype.convertObjectToJavascript as Sinon.SinonSpy).restore();
            });

            it("Converts the object from a list to a map.", () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "stringParam",
                    attributes: {
                        stringParam: {
                            type: "S",
                            constant: true
                        }
                    }
                };
                const builder = new Builder("TestParam", schema);
                const obj = builder.convertObjectToSchema({
                    "TestParam": [{ stringParam: "TestValue" }]
                });
                expect(obj).to.deep.equal({
                    "TestParam": {
                        "TestValue": {
                            stringParam: "TestValue"
                        }
                    }
                });
            });

            it("Converts the items in the schema.", () => {
                const date = new Date();
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "stringParam",
                    attributes: {
                        stringParam: {
                            type: "S",
                            constant: true
                        },
                        dateParam: {
                            type: "Date"
                        }
                    }
                };
                const builder = new Builder("TestParam", schema);
                const obj = builder.convertObjectToSchema({
                    "TestParam": [{ stringParam: "TestValue", dateParam: date }]
                });
                expect(obj).to.deep.equal({
                    "TestParam": {
                        "TestValue": {
                            stringParam: "TestValue",
                            dateParam: date.toISOString()
                        }
                    }
                });
            });
        },
        convertFromSchemaTests: () => {
            it("Converts the object from a map to a list.", () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "stringParam",
                    attributes: {
                        stringParam: {
                            type: "S",
                            constant: true
                        }
                    }
                };
                const builder = new Builder("TestParam", schema);
                const obj = builder.convertObjectFromSchema({
                    "TestParam": { "TestValue": { stringParam: "TestValue" } }
                });
                expect(obj).to.deep.equal({
                    "TestParam": [{
                        stringParam: "TestValue"
                    }]
                });
            });

            it("Converts the nested objects.", () => {
                const date = new Date();
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "stringParam",
                    attributes: {
                        stringParam: {
                            type: "S",
                            constant: true
                        },
                        dateParam: {
                            type: "Date"
                        }
                    }
                };
                const builder = new Builder("TestParam", schema);
                const obj = builder.convertObjectFromSchema({
                    "TestParam": {
                        "TestValue": {
                            stringParam: "TestValue",
                            dateParam: date.toISOString()
                        }
                    }
                });
                expect(obj).to.deep.equal({
                    "TestParam": [{
                        stringParam: "TestValue",
                        dateParam: date
                    }]
                });
            });
        },
        convertUpdateToSchemaTests: () => {
            it("Does not wipe the attributes of other items in the update.", () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "stringParam",
                    attributes: {
                        stringParam: {
                            type: "S"
                        },
                        constParam: {
                            type: "S"
                        },
                        requiredParam: {
                            type: "S",
                        },
                        numParam: {
                            type: "N"
                        }
                    }
                };
                const builder = new Builder("TestParam", schema);
                const obj = builder.convertUpdateObjectToSchema({
                    set: {
                        "AnotherAttribute": "Value"
                    },
                    append: {
                        "ArrayAttribute": ["Value"]
                    },
                    prepend: {
                        "ArrayAttribute": ["Value"]
                    },
                    remove: ["RemovableAttribute"]
                });
                expect(obj).to.deep.equal({
                    set: {
                        "AnotherAttribute": "Value"
                    },
                    append: {
                        "ArrayAttribute": ["Value"]
                    },
                    prepend: {
                        "ArrayAttribute": ["Value"]
                    },
                    remove: ["RemovableAttribute"]
                });
            });

            it("Does not crash when there is an append but no prepend.", () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "stringParam",
                    attributes: {
                        stringParam: {
                            type: "S"
                        },
                        constParam: {
                            type: "S"
                        },
                        requiredParam: {
                            type: "S",
                        },
                        numParam: {
                            type: "N"
                        },
                        dateParam: {
                            type: "Date"
                        }
                    }
                };
                const date = new Date();
                const builder = new Builder("TestParam", schema);
                const obj = builder.convertUpdateObjectToSchema({
                    append: {
                        "TestParam": [{
                            stringParam: "StringKey",
                            constParam: "Value",
                            numParam: 5,
                            dateParam: date
                        }]
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestParam.StringKey": {
                            stringParam: "StringKey",
                            constParam: "Value",
                            numParam: 5,
                            dateParam: date.toISOString()
                        }
                    }
                });
            });

            it("Does not crash when there is an prepend but no append.", () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "stringParam",
                    attributes: {
                        stringParam: {
                            type: "S"
                        },
                        constParam: {
                            type: "S"
                        },
                        requiredParam: {
                            type: "S",
                        },
                        numParam: {
                            type: "N"
                        },
                        dateParam: {
                            type: "Date"
                        }
                    }
                };
                const date = new Date();
                const builder = new Builder("TestParam", schema);
                const obj = builder.convertUpdateObjectToSchema({
                    prepend: {
                        "TestParam": [{
                            stringParam: "StringKey",
                            constParam: "Value",
                            numParam: 5,
                            dateParam: date
                        }]
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestParam.StringKey": {
                            stringParam: "StringKey",
                            constParam: "Value",
                            numParam: 5,
                            dateParam: date.toISOString()
                        }
                    }
                });
            });

            it("Tests that the set is currently converted.", async () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "stringParam",
                    attributes: {
                        stringParam: {
                            type: "S"
                        },
                        constParam: {
                            type: "S"
                        },
                        requiredParam: {
                            type: "S",
                        },
                        numParam: {
                            type: "N"
                        }
                    }
                };
                const builder = new Builder("TestParam", schema);
                const obj = builder.convertUpdateObjectToSchema({
                    set: {
                        "TestParam": [{
                            stringParam: "StringKey",
                            constParam: "Value",
                            numParam: 5
                        }]
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestParam": {
                            "StringKey": {
                                stringParam: "StringKey",
                                constParam: "Value",
                                numParam: 5
                            }
                        }
                    }
                });
            });

            it("Tests that the append is currently converted.", async () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "stringParam",
                    attributes: {
                        stringParam: {
                            type: "S"
                        },
                        constParam: {
                            type: "S"
                        },
                        requiredParam: {
                            type: "S",
                        },
                        numParam: {
                            type: "N"
                        },
                        dateParam: {
                            type: "Date"
                        }
                    }
                };
                const date = new Date();
                const builder = new Builder("TestParam", schema);
                const obj = builder.convertUpdateObjectToSchema({
                    append: {
                        "TestParam": [{
                            stringParam: "StringKey",
                            constParam: "Value",
                            numParam: 5,
                            dateParam: date
                        }]
                    },
                    prepend: {
                        "TestParam": [{
                            stringParam: "StringKey2",
                            constParam: "Value",
                            numParam: 5,
                            dateParam: date
                        }]
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestParam.StringKey": {
                            stringParam: "StringKey",
                            constParam: "Value",
                            numParam: 5,
                            dateParam: date.toISOString()
                        },
                        "TestParam.StringKey2": {
                            stringParam: "StringKey2",
                            constParam: "Value",
                            numParam: 5,
                            dateParam: date.toISOString()
                        }
                    }
                });
            });
        },
        validationTests: () => {
            it("Tests that the items are validated.", async () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "Key",
                    attributes: {
                        key: {
                            type: "S",
                        },
                        stringParam: {
                            type: "S",
                            constant: true
                        }
                    }
                };
                const builder = new Builder("TestParam", schema);
                const errors = builder.validateObjectAgainstSchema({
                    "TestParam": {
                        Key: {
                            Key: "Key",
                            stringParam: 5
                        }
                    }
                });
                expect(errors).to.deep.equal(['Key "stringParam" is expected to be of type string but got number.']);
            });
        },
        updateValidationTests: () => {
            it("Tests that the items are validated in set.", async () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "Key",
                    attributes: {
                        Key: {
                            type: "S",
                            required: true,
                        },
                        stringParam: {
                            type: "S",
                            constant: true
                        },
                        constParam: {
                            type: "S",
                            constant: true
                        },
                        requiredParam: {
                            type: "S",
                            required: true,
                        },
                        numParam: {
                            type: "N"
                        }
                    }
                };
                const builder = new Builder("TestParam", schema);
                const errors = builder.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestParam": {
                            Key: {
                                Key: "Key",
                                constParam: "Value",
                                numParam: "Value"
                            }
                        }
                    }
                });
                expect(errors).to.deep.equal([
                    "Key \"requiredParam\" is required but is not defined.",
                    "Key \"numParam\" is expected to be of type number but got string."
                ]);
            });

            it("Validates set objects that were added via append or prepend", () => {
                const schema: MappedListSchema = {
                    type: "MappedList",
                    keyAttribute: "Key",
                    attributes: {
                        Key: {
                            type: "S",
                            required: true,
                        },
                        stringParam: {
                            type: "S",
                            constant: true
                        },
                        constParam: {
                            type: "S",
                            constant: true
                        },
                        requiredParam: {
                            type: "S",
                            required: true,
                        },
                        numParam: {
                            type: "N"
                        }
                    }
                };
                const builder = new Builder("TestParam", schema);
                const errors = builder.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestParam.Key": {
                            Key: "Key",
                            constParam: "Value",
                            numParam: "Value"
                        }
                    }
                });
                expect(errors).to.deep.equal([
                    "Key \"requiredParam\" is required but is not defined.",
                    "Key \"numParam\" is expected to be of type number but got string."
                ]);
            });
            // Append and Prepend don't need to be tested because they don't make sense. They're converted to set.
        }
    });
});