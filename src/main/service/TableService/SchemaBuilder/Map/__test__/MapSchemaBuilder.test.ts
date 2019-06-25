import { expectToHaveErrors } from "../../__test__/ValidatorTestUtils";
import { buildNormalSchemaTests } from "../../Normal/__test__/NormalSchemaBuilder.test";
import MapSchemaBuilder, { MapSchema } from "../MapSchemaBuilder";

function mapSchemaBuilder(key: string, schema: Pick<MapSchema, Exclude<keyof MapSchema, "type">>) {
    return new MapSchemaBuilder(key, { ...schema, type: "M" });
}

describe(MapSchemaBuilder.name, () => {
    buildNormalSchemaTests<MapSchemaBuilder, object>({
        valueType: "object",
        schemaBuilder: mapSchemaBuilder,
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
        }
    });
});
