import * as Chai from "chai";
import { expectToHaveErrors, expectToHaveNoErrors } from "../../__test__/ValidatorTestUtils";
import { buildNormalSchemaTests } from "../../Normal/__test__/NormalSchemaBuilder.test";
import MapSchemaBuilder, { MapSchema } from "../MapSchemaBuilder";

const expect = Chai.expect;

function mapSchemaBuilder(key: string, schema: Pick<MapSchema, Exclude<keyof MapSchema, "type">>) {
    return new MapSchemaBuilder(key, { ...schema, type: "M" });
}

describe(MapSchemaBuilder.name, () => {
    buildNormalSchemaTests<MapSchemaBuilder, object>({
        valueType: "object",
        schemaBuilder: mapSchemaBuilder,
        convertFromSchemaTests: () => {
            it("Processes nested objects.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestNumber": {
                                    type: "N",
                                    process: {
                                        toObj: (num: number) => num,
                                        fromObj: (num: number) => ++num
                                    }
                                },
                                "TestNumber2": {
                                    type: "N",
                                    process: {
                                        toObj: (num: number) => num,
                                        fromObj: (num: number) => --num
                                    }
                                }
                            }
                        }
                    }
                });
                const obj = schema.convertObjectFromSchema({
                    "TestItem": {
                        "TestParam": {
                            "TestNumber": 5,
                            "TestNumber2": 5,
                            "TestString": "Value"
                        }
                    }
                });
                expect(obj).to.deep.equal({
                    "TestItem": {
                        "TestParam": {
                            "TestNumber": 6,
                            "TestNumber2": 4,
                            "TestString": "Value"
                        }
                    }
                });
            });

            it("Processes nested DATE objects.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestDate": {
                                    type: "Date"
                                }
                            }
                        }
                    }
                });
                const date = new Date();
                const obj = schema.convertObjectFromSchema({
                    "TestItem": {
                        "TestParam": {
                            "TestDate": date.toISOString()
                        }
                    }
                });
                expect(obj).to.deep.equal({
                    "TestItem": {
                        "TestParam": {
                            "TestDate": date
                        }
                    }
                });
            });
        },
        convertToSchemaTests: () => {
            it("Processes nested objects.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestNumber": {
                                    type: "N",
                                    process: (num: number) => ++num
                                },
                                "TestNumber2": {
                                    type: "N",
                                    process: (num: number) => --num
                                }
                            }
                        }
                    }
                });
                const obj = schema.convertObjectToSchema({
                    "TestItem": {
                        "TestParam": {
                            "TestNumber": 5,
                            "TestNumber2": 5,
                            "TestValue": "String"
                        }
                    }
                });
                expect(obj).to.deep.equal({
                    "TestItem": {
                        "TestParam": {
                            "TestNumber": 6,
                            "TestNumber2": 4,
                            "TestValue": "String"
                        }
                    }
                });
            });

            it("Processes nested DATE objects.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestDate": {
                                    type: "Date"
                                }
                            }
                        }
                    }
                });
                const date = new Date();
                const obj = schema.convertObjectToSchema({
                    "TestItem": {
                        "TestParam": {
                            "TestDate": date
                        }
                    }
                });
                expect(obj).to.deep.equal({
                    "TestItem": {
                        "TestParam": {
                            "TestDate": date.toISOString()
                        }
                    }
                });
            });

            it("Does not add attributes that are not being set.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestNumber": {
                                    type: "N",
                                    process: (num: number) => ++num
                                },
                                "TestNumber2": {
                                    type: "N",
                                    process: (num: number) => num ? --num : undefined
                                }
                            }
                        }
                    }
                });
                const obj = schema.convertObjectToSchema({
                    "TestItem": {
                        "TestParam": {
                            "TestNumber": 5
                        }
                    }
                });
                expect(obj).to.deep.equal({
                    "TestItem": {
                        "TestParam": {
                            "TestNumber": 6
                        }
                    }
                });
            });
        },
        convertUpdateToSchemaTests: () => {
            it("Processes nested objects in set attribute.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestNumber": {
                                    type: "N",
                                    process: (num: number) => ++num
                                },
                                "TestNumber2": {
                                    type: "N",
                                    process: (num: number) => --num
                                }
                            }
                        }
                    }
                });
                const obj = schema.convertUpdateObjectToSchema({
                    set: {
                        "TestItem": {
                            "TestParam": {
                                "TestNumber": 5,
                                "TestNumber2": 5,
                                "TestValue": "Value"
                            }
                        }
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestItem": {
                            "TestParam": {
                                "TestNumber": 6,
                                "TestNumber2": 4,
                                "TestValue": "Value"
                            }
                        }
                    }
                });
            });

            it("Processes nested DATE objects in set attribute.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestDate": {
                                    type: "Date"
                                }
                            }
                        }
                    }
                });
                const date = new Date();
                const obj = schema.convertUpdateObjectToSchema({
                    set: {
                        "TestItem": {
                            "TestParam": {
                                "TestDate": date
                            }
                        }
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestItem": {
                            "TestParam": {
                                "TestDate": date.toISOString()
                            }
                        }
                    }
                });
            });

            it("Processes nested DATE objects in set attribute if explicitly defined.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestDate": {
                                    type: "Date"
                                }
                            }
                        }
                    }
                });
                const date = new Date();
                const obj = schema.convertUpdateObjectToSchema({
                    set: {
                        "TestItem.TestParam.TestDate": date
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestItem.TestParam.TestDate": date.toISOString()
                    }
                });
            });

            it("Sets only the nested object if explicitly defined.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestNumber": {
                                    type: "N",
                                    process: (num: number) => ++num
                                },
                                "TestNumber2": {
                                    type: "N",
                                    process: (num: number) => --num
                                }
                            }
                        }
                    }
                });
                const obj = schema.convertUpdateObjectToSchema({
                    set: {
                        "TestItem.TestParam.TestNumber": 5,
                        "TestItem.TestParam.TestNumber2": 5,
                        "TestItem.TestParam.TestString": "Value"
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestItem.TestParam.TestNumber": 6,
                        "TestItem.TestParam.TestNumber2": 4,
                        "TestItem.TestParam.TestString": "Value"
                    }
                });
            });

            it("Does not set attributes that are not in the object.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestNumber": {
                                    type: "N",
                                    process: (num: number) => ++num
                                },
                                "TestNumber2": {
                                    type: "N",
                                    process: (num: number) => --num
                                }
                            }
                        }
                    }
                });
                const obj = schema.convertUpdateObjectToSchema({
                    set: {
                        "TestItem.TestParam.TestNumber": 5
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestItem.TestParam.TestNumber": 6
                    }
                });
            });
        },
        validationTests: () => {
            it("Returns an error is thrown if the object does not have the appropriate keys.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    onlyAllowDefinedAttributes: true,
                    attributes: {
                        "TestParam": {
                            type: "S"
                        }
                    }
                });
                const errors = schema.validateObjectAgainstSchema({
                    "TestItem": {
                        "SomethingElse": "Oh No!"
                    }
                });
                expectToHaveErrors(errors, "Map attribute \"TestItem\" has forbidden keys \"SomethingElse\".");
            });

            it("Returns an error if a string attribute does not follow standards.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestString": {
                            "type": "S",
                            invalidCharacters: ":"
                        }
                    }
                });
                const errors = schema.validateObjectAgainstSchema({
                    "TestItem": {
                        "TestString": "Oh:No"
                    }
                });
                expectToHaveErrors(errors, "Key \"TestString\" contains invalid characters \":\".");
            });

            it("Returns an error if a nested string attribute does not follow standards.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestString": {
                                    "type": "S",
                                    invalidCharacters: ":"
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateObjectAgainstSchema({
                    "TestItem": {
                        "TestParam": {
                            "TestString": "Oh:No"
                        }
                    }
                });
                expectToHaveErrors(errors, "Key \"TestString\" contains invalid characters \":\".");
            });

            it("Returns an error if a nested date attribute is not an actual date.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestDate": {
                                    "type": "Date",
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateObjectAgainstSchema({
                    "TestItem": {
                        "TestParam": {
                            "TestDate": "This isn't a valid date I can't believe someone passed this to me."
                        }
                    }
                });
                expectToHaveErrors(errors, "Key \"TestDate\" is not a valid date.");
            });

            it("Returns no error if the attributes are undefined.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestString": {
                            type: "S"
                        }
                    }
                });
                const errors = schema.validateObjectAgainstSchema({
                    "TestItem": undefined
                });
                expectToHaveNoErrors(errors);
            });

            it("Returns no errors if the map is empty with optional parameters.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestString": {
                            type: "S"
                        }
                    }
                });
                const errors = schema.validateObjectAgainstSchema({
                    "TestItem": {}
                });
                expectToHaveNoErrors(errors);
            });
        },
        updateValidationTests: () => {
            it("Returns an error if the set object has an undefined parameter and 'onlyAllowDefinedAttributes' is true.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    onlyAllowDefinedAttributes: true,
                    attributes: {
                        "TestParam": {
                            type: "S"
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestItem": {
                            "SomethingElse": "Oh No!"
                        }
                    }
                });
                expectToHaveErrors(errors, "Map attribute \"TestItem\" has forbidden keys \"SomethingElse\".");
            });

            it("Returns an error if a string attribute does not follow standards.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestString": {
                            "type": "S",
                            invalidCharacters: ":"
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestItem": {
                            "TestString": "Oh:No"
                        }
                    }
                });
                expectToHaveErrors(errors, "Key \"TestString\" contains invalid characters \":\".");
            });

            it("Returns an error if a nested string attribute does not follow standards.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestString": {
                                    "type": "S",
                                    invalidCharacters: ":"
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestItem": {
                            "TestParam": {
                                "TestString": "Oh:No"
                            }
                        }
                    }
                });
                expectToHaveErrors(errors, "Key \"TestString\" contains invalid characters \":\".");
            });

            it("Returns an error if a nested date attribute is not a valid date.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestDate": {
                                    "type": "Date"
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestItem": {
                            "TestParam": {
                                "TestDate": "This isn't a valid date I can't believe someone gave this to me."
                            }
                        }
                    }
                });
                expectToHaveErrors(errors, "Key \"TestDate\" is not a valid date.");
            });

            it("Does *not* return an error if a required nested attribute is not included in the set object.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestAtt": {
                                    "type": "S",
                                    required: true
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestItem": {
                            "TestParam": {
                                "SomethingElse": "Value"
                            }
                        }
                    }
                });
                expectToHaveNoErrors(errors);
            });

            it("Returns an error if a constant nested attribute is being set to something else.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestAtt": {
                                    "type": "S",
                                    constant: true,
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestItem": {
                            "TestParam": {
                                "TestAtt": undefined
                            }
                        }
                    }
                });
                expectToHaveErrors(errors, "Key \"TestAtt\" is constant and can not be modified.");
            });

            it("Returns an error if a constant nested attribute is being appended to something else.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestAtt": {
                                    "type": "L",
                                    constant: true,
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    append: {
                        "TestItem": {
                            "TestParam": {
                                "TestAtt": ["New Item"]
                            }
                        }
                    }
                });
                expectToHaveErrors(errors, "Key \"TestAtt\" is constant and can not be modified.");
            });

            it("Returns an error if a required nested attribute is being set to undefined.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestAtt": {
                                    "type": "S",
                                    required: true
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestItem": {
                            "TestParam": {
                                "TestAtt": undefined
                            }
                        }
                    }
                });
                expectToHaveErrors(errors, "Key \"TestAtt\" is required and can not be removed.");
            });

            it("Returns an error if a required nested attribute is being removed.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestAtt": {
                                    "type": "S",
                                    required: true
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    remove: ["TestParam.TestAtt"]
                });
                expectToHaveErrors(errors, "Key \"TestAtt\" is required and can not be removed.");
            });

            it("Returns an error if a required nested attribute is being removed.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestParam": {
                            type: "M",
                            attributes: {
                                "TestMap": {
                                    type: "M",
                                    attributes: {
                                        "TestAtt": {
                                            "type": "S",
                                            required: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    remove: ["TestParam.TestMap.TestAtt"]
                });
                expectToHaveErrors(errors, "Key \"TestAtt\" is required and can not be removed.");
            });

            it("Returns no error if setting the map attribute to undefined.", () => {
                const schema = mapSchemaBuilder("TestItem", {
                    attributes: {
                        "TestString": {
                            type: "S"
                        }
                    }
                });
                const errors = schema.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestItem": undefined
                    }
                });
                expectToHaveNoErrors(errors);
            });
        }
    });
});
