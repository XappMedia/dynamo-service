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
import { buildNormalSchemaTests } from "../../Normal/__test__/NormalSchemaBuilder.test";
import ListSchemaBuilder, { DynamoListSchema } from "../ListSchemaBuilder";

const expect = Chai.expect;

function listSchemaBuilder(key: string, schema: DynamoListSchema<object>) {
    return new ListSchemaBuilder(key, { ...schema, type: "L" });
}

describe(ListSchemaBuilder.name, () => {
    buildNormalSchemaTests<ListSchemaBuilder, object>({
        valueType: "object",
        schemaBuilder: listSchemaBuilder,
        convertToSchemaTests: () => {
            it("Tests that the contents are converted.", async () => {
                const date = new Date();
                const schema: DynamoListSchema = {
                    type: "L",
                    mapAttributes: {
                        dateParam: {
                            type: "Date"
                        }
                    }
                };
                const builder = new ListSchemaBuilder("TestParam", schema);
                const obj = builder.convertObjectToSchema({
                    "TestParam": [{ dateParam: date }]
                });
                expect(obj).to.deep.equal({ "TestParam": [{ dateParam: date.toISOString() }] });
            });
        },
        convertFromSchemaTests: () => {
            it("Tests that the items are converted.", () => {
                const date = new Date();
                const schema: DynamoListSchema = {
                    type: "L",
                    mapAttributes: {
                        dateParam: {
                            type: "Date"
                        }
                    }
                };
                const builder = new ListSchemaBuilder("TestParam", schema);
                const obj = builder.convertObjectFromSchema({
                    "TestParam": [{ dateParam: date.toISOString() }]
                });
                console.log("OBJ2", JSON.stringify(obj, undefined, 2));
                expect(obj).to.deep.equal({ "TestParam": [{ dateParam: date }] });
            });
        },
        convertUpdateToSchemaTests: () => {
            it("Tests that the items in the set are converted.", () => {
                const date = new Date();
                const schema: DynamoListSchema = {
                    type: "L",
                    mapAttributes: {
                        dateParam: {
                            type: "Date"
                        }
                    }
                };
                const builder = new ListSchemaBuilder("TestParam", schema);
                const obj = builder.convertUpdateObjectToSchema({
                    set: {
                        "TestParam": [{ dateParam: date }]
                    }
                });
                expect(obj).to.deep.equal({
                    set: {
                        "TestParam": [{ dateParam: date.toISOString() }]
                    }
                });
            });

            it("Tests that items in the append and prepend are converted.", () => {
                const date = new Date();
                const schema: DynamoListSchema = {
                    type: "L",
                    mapAttributes: {
                        dateParam: {
                            type: "Date"
                        }
                    }
                };
                const builder = new ListSchemaBuilder("TestParam", schema);
                const obj = builder.convertUpdateObjectToSchema({
                    append: {
                        "TestParam": [{ dateParam: date }]
                    },
                    prepend: {
                        "TestParam": [{ dateParam: date }]
                    }
                });
                expect(obj).to.deep.equal({
                    append: {
                        "TestParam": [{ dateParam: date.toISOString() }]
                    },
                    prepend: {
                        "TestParam": [{ dateParam: date.toISOString() }]
                    }
                });
            });
        },
        validationTests: () => {
            it("Performs validation on all elements in the list.", () => {
                const schema: DynamoListSchema = {
                    type: "L",
                    mapAttributes: {
                        numberParam1: {
                            type: "N"
                        },
                        numberParam2: {
                            type: "N"
                        },
                    }
                };
                const builder = new ListSchemaBuilder("TestParam", schema);
                const errors = builder.validateObjectAgainstSchema({
                    "TestParam": [{
                        numberParam1: "Value"
                    }, {
                        numberParam2: "Value"
                    }]
                });
                expect(errors).to.deep.equal([
                    'Key \"numberParam1\" is expected to be of type number but got string.',
                    'Key \"numberParam2\" is expected to be of type number but got string.',
                ]);
            });
        },
        updateValidationTests: () => {
            it("Performs validation on all elements in the list.", () => {
                const schema: DynamoListSchema = {
                    type: "L",
                    mapAttributes: {
                        numberParam1: {
                            type: "N"
                        },
                        numberParam2: {
                            type: "N"
                        },
                    }
                };
                const builder = new ListSchemaBuilder("TestParam", schema);
                const errors = builder.validateUpdateObjectAgainstSchema({
                    set: {
                        "TestParam": [{
                            numberParam1: "Value"
                        }, {
                            numberParam2: "Value"
                        }]
                    },
                    append: {
                        "TestParam": [{
                            numberParam1: "Value"
                        }, {
                            numberParam2: "Value"
                        }]
                    },
                    prepend: {
                        "TestParam": [{
                            numberParam1: "Value"
                        }, {
                            numberParam2: "Value"
                        }]
                    }
                });
                expect(errors).to.deep.equal([
                    'Key \"numberParam1\" is expected to be of type number but got string.',
                    'Key \"numberParam2\" is expected to be of type number but got string.',
                    'Key \"numberParam1\" is expected to be of type number but got string.',
                    'Key \"numberParam2\" is expected to be of type number but got string.',
                    'Key \"numberParam1\" is expected to be of type number but got string.',
                    'Key \"numberParam2\" is expected to be of type number but got string.',
                ]);
            });
        }
    });
});