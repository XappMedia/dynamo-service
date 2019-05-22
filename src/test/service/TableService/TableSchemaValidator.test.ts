import * as Chai from "chai";

import * as Schema from "../../../main/service/KeySchema";
import * as Validator from "../../../main/service/TableService/TableSchemaValidator";

const defaultSchema: Schema.TableSchema<any> = {
    primaryKey: {
        primary: true,
        type: "N"
    }
};

const tableName = "TestTable";

const expect = Chai.expect;

describe("TableSchemaValidator", () => {
    describe("Constructor", () => {
        it("Tests that no error is thrown if the schema is valid.", () => {
            return checkNoError(() => {
                new Validator.TableSchemaValidator<any>(
                    {
                        ...defaultSchema,
                        sort: {
                            sort: true,
                            type: "N"
                        }
                    },
                    tableName
                );
            });
        });

        it("Tests that an error is thrown if the schema has no primary keys.", () => {
            return checkError(() => {
                new Validator.TableSchemaValidator<any>({ }, tableName);
            });
        });

        it("Tests that an error is thrown if the schema has two primary keys.", () => {
            return checkError(() => {
                new Validator.TableSchemaValidator<any>(
                    {
                        ...defaultSchema,
                        secondPrimary: {
                            primary: true,
                            type: "N"
                        }
                    },
                    tableName
                );
            });
        });

        it("Tests that an error is thrown if the schema has two sort keys.", () => {
            return checkError(() => {
                new Validator.TableSchemaValidator<any>(
                    {
                        ...defaultSchema,
                        sortPrimary: {
                            sort: true,
                            type: "N"
                        },
                        sortSecondary: {
                            sort: true,
                            type: "N"
                        }
                    },
                    tableName
                );
            });
        });
    });

    describe("Validate", () => {
        it("Tests that an error is thrown if primary key is not available", () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema
                },
                tableName
            );
            return checkNoError(() => {
                validator.validate({
                    primaryKey: 5
                });
            }).then(() =>
                checkError(() => {
                    validator.validate({});
                })
            );
        });

        it("Tests that an error is thrown if sort key is not available", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    sortKey: {
                        type: "N",
                        sort: true
                    }
                },
                tableName
            );

            await checkNoError(() => validator.validate({ primaryKey: 5, sortKey: 4 }));
            await checkError(() => validator.validate({ primaryKey: 5 }));
        });

        it("Tests that an error is thrown if string does not fit an enum", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    stringParam: {
                        type: "S",
                        enum: ["One"]
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validate({ primaryKey: 5, stringParam: "One" }));
            await checkError(() => validator.validate({ primaryKey: 5, stringParam: "Two" }));
        });

        it("Tests that items with invalid characters are marked as invalid.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    stringParam: {
                        type: "S",
                        invalidCharacters: "-"
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validate({ primaryKey: 5, stringParam: "Test" }));
            await checkError(() => validator.validate({ primaryKey: 5, stringParam: "Test-Test" }));
        });

        it("Tests that items with extra keys are marked as invalid.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema
                },
                tableName
            );
            await checkNoError(() => validator.validate({ primaryKey: 5 }));
            await checkError(() => validator.validate({ primaryKey: 5, invalidAttrib: "Test" }));
        });

        it("Tests that keys which are required are marked as invalid.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    requiredKey: {
                        type: "N",
                        required: true
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validate({ primaryKey: 5, requiredKey: 4 }));
            await checkError(() => validator.validate({ primaryKey: 5 }));
        });

        it("Tests that values in the wrong format are marked as invalid.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    formatted: {
                        type: "S",
                        format: /[0-9]./
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validate({ primaryKey: 5, formatted: "1234" }));
            await checkError(() => validator.validate({ primaryKey: 5, formatted: "Wrong" }));
        });
    });

    describe("Validate Update Obj", () => {
        it("Tests that an error is thrown if primary key is attempted to be modified.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S"
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validateUpdateObj({ set: { normal: "Test" } }));
            await checkError(() => validator.validateUpdateObj({ set: { primaryKey: 4 } }));
            await checkError(() => validator.validateUpdateObj({ remove: ["primaryKey"] as any }));
            await checkError(() => validator.validateUpdateObj({ append: { primaryKey: [4] } }));
        });

        it("Tests that an error is thrown if sort key is attempted to be modified.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    sort: {
                        type: "S",
                        sort: true
                    },
                    normal: {
                        type: "S"
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validateUpdateObj({ set: { normal: "Test" } }));
            await checkError(() => validator.validateUpdateObj({ set: { sort: "Test" } }));
            await checkError(() => validator.validateUpdateObj({ remove: ["sort"] as any }));
            await checkError(() => validator.validateUpdateObj({ append: { sort: ["Test"] } }));
        });

        it("Tests that an error is thrown if constant keys are trying to be modified", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S"
                    },
                    constant: {
                        type: "S",
                        constant: true
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validateUpdateObj({ set: { normal: "Test" } }));
            await checkError(() => validator.validateUpdateObj({ set: { constant: "Test" } }));
            await checkError(() => validator.validateUpdateObj({ remove: ["constant"] as any }));
            await checkError(() => validator.validateUpdateObj({ append: { constant: ["Test2"] } }));
        });

        it("Tests that an error is thrown if a required key is removed.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S"
                    },
                    required: {
                        type: "S",
                        required: true
                    }
                },
                tableName
            );
            await checkNoError(() =>
                validator.validateUpdateObj({ remove: ["normal"] as any, set: { required: "Test" } })
            );
            await checkError(() => validator.validateUpdateObj({ remove: ["required"] as any }));
        });

        it("Tests that an error is thrown if a formatted string is updated to wrong format.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S",
                        format: /[0-9]./
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validateUpdateObj({ set: { normal: "1234" } }));
            await checkError(() => validator.validateUpdateObj({ set: { normal: "Wrong" } }));
        });

        it("Tests that an error is thrown if an enum string is updated with an improper enum.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S",
                        enum: ["One", "Two"]
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validateUpdateObj({ set: { normal: "Two" } }));
            await checkError(() => validator.validateUpdateObj({ set: { normal: "Wrong" } }));
        });

        it("Tests that an error is thrown if a string with invalid character is updated with invalid characters.", async () => {
            const validator = new Validator.TableSchemaValidator<any>(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S",
                        invalidCharacters: "-"
                    }
                },
                tableName
            );
            await checkNoError(() => validator.validateUpdateObj({ set: { normal: "Test" } }));
            await checkError(() => validator.validateUpdateObj({ set: { normal: "Test-Test" } }));
        });
    });

    describe("Map objects", () => {
        describe("Validate object", () => {
            it("Tests that a map without defined attributes passes.", async () => {
                const validator = new Validator.TableSchemaValidator<any>(
                    {
                        ...defaultSchema,
                        map: {
                            type: "M",
                        }
                    },
                    tableName
                );
                await checkNoError(() => validator.validate({ primaryKey: 5, map: { works: 5 }}));
                await checkNoError(() => validator.validate({ primaryKey: 5, map: { anotherAttrib: 5 }}));
            });

            it("Tests that a map without defined attributes passes even if 'onlyAllowDefinedAttributes' is set to true.", async () => {
                const validator = new Validator.TableSchemaValidator<any>(
                    {
                        ...defaultSchema,
                        map: {
                            type: "M",
                            onlyAllowDefinedAttributes: true
                        }
                    },
                    tableName
                );
                await checkNoError(() => validator.validate({ primaryKey: 5, map: { works: 5 }}));
                await checkNoError(() => validator.validate({ primaryKey: 5, map: { anotherAttrib: 5 }}));
            });

            it("Tests that a map with defined attributes fails if 'onlyAllowDefinedAttributes' is set to true but someone tries to add one.", async () => {
                const validator = new Validator.TableSchemaValidator<any>(
                    {
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                works: {
                                    type: "N"
                                }
                            },
                            onlyAllowDefinedAttributes: true
                        }
                    },
                    tableName
                );
                await checkNoError(() => validator.validate({ primaryKey: 5, map: { works: 5 }}));
                await checkError(() => validator.validate({ primaryKey: 5, map: { anotherAttrib: 5 }}));
            });

            it("Tests that a map with required keys are tested.", async () => {
                const validator = new Validator.TableSchemaValidator<any>(
                    {
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                requiredKey: {
                                    type: "N",
                                    required: true
                                }
                            }
                        }
                    },
                    tableName
                );
                await checkNoError(() => validator.validate({ primaryKey: 5, map: { requiredKey: 5 }}));
                await checkNoError(() => validator.validate({ primaryKey: 5 }));
                await checkError(() => validator.validate({ primaryKey: 5, map: { requiredKey: undefined }}));
                await checkError(() => validator.validate({ primaryKey: 5, map: { }}));
            });

            it("Tests that a map with a formatted string is tested.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            stringAttrib: {
                                type: "S",
                                format: /[0-9]./
                            }
                        }
                    }
                }, tableName);

                await checkNoError(() => validator.validate({ primaryKey: 5, map: { stringAttrib: "123" }}));
                await checkError(() => validator.validate({ primaryKey: 5, map: { stringAttrib: "Wrong" }}));
            });

            it("Tests that a map with string which contains invalid characters is tested.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            stringAttrib: {
                                type: "S",
                                invalidCharacters: "-"
                            }
                        }
                    }
                }, tableName);

                await checkNoError(() => validator.validate({ primaryKey: 5, map: { stringAttrib: "Test" }}));
                await checkError(() => validator.validate({ primaryKey: 5, map: { stringAttrib: "Test-Test" }}));
            });

            it("Tests that a map with string which contains enums is tested.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            stringAttrib: {
                                type: "S",
                                enum: ["One"]
                            }
                        }
                    }
                }, tableName);

                await checkNoError(() => validator.validate({ primaryKey: 5, map: { stringAttrib: "One" }}));
                await checkError(() => validator.validate({ primaryKey: 5, map: { stringAttrib: "Two" }}));
            });

            it("Tests that there is no error if there are no extra keys and 'onlyDefinedAttributes' is set not set.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            testAttrib: {
                                type: "M"
                            }
                         }
                    }
                }, tableName);
                await checkNoError(() => validator.validate({ primaryKey: 5, map: { }}));
                await checkNoError(() => validator.validate({ primaryKey: 5, map: { stringAttrib: "Test" }}));
            });

            it("Tests that there is an error thrown if trying to add an undefined attribute and 'onlyDefinedAttributes' is set to true.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        onlyAllowDefinedAttributes: true,
                        attributes: {
                            testAttrib: {
                                type: "M"
                            }
                         }
                    }
                }, tableName);
                await checkNoError(() => validator.validate({ primaryKey: 5, map: { }}));
                await checkError(() => validator.validate({ primaryKey: 5, map: { stringAttrib: "Test" }}));
            });
        });

        describe("Validate update object", () => {
            it("Tests that required attributes are checked.", async () => {
                const validator = new Validator.TableSchemaValidator<any>(
                    {
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                requiredKey: {
                                    type: "N",
                                    required: true
                                }
                            }
                        }
                    },
                    tableName
                );
                await checkNoError(() => validator.validateUpdateObj({ set: { map: { requiredKey: 5 }}}));
                await checkError(() => validator.validateUpdateObj({ set: { map: { requiredKey: undefined }}}));
                await checkError(() => validator.validateUpdateObj({ set: { map: { }}}));
            });

            it("Tests that formatted strings are checked.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            stringAttrib: {
                                type: "S",
                                format: /[0-9]./
                            }
                        }
                    }
                }, tableName);

                await checkNoError(() => validator.validateUpdateObj({ set: { map: { stringAttrib: "123" }}}));
                await checkError(() => validator.validateUpdateObj({ set: { map: { stringAttrib: "Wrong" }}}));
            });

            it("Tests that strings with invalidate characters are checked.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            stringAttrib: {
                                type: "S",
                                invalidCharacters: "-"
                            }
                        }
                    }
                }, tableName);

                await checkNoError(() => validator.validateUpdateObj({ set: { map: { stringAttrib: "Test" }}}));
                await checkError(() => validator.validateUpdateObj({ set: { map: { stringAttrib: "Test-Test" }}}));
            });

            it("Tests that strings with enums are checked.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            stringAttrib: {
                                type: "S",
                                enum: ["One"]
                            }
                        }
                    }
                }, tableName);

                await checkNoError(() => validator.validateUpdateObj({ set: { map: { stringAttrib: "One" }}}));
                await checkError(() => validator.validateUpdateObj({ set: { map: { stringAttrib: "Two" }}}));
            });

            it("Tests that it checks is ok if there are 'onlyAllowDefinedAttributes' is not set..", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            testAttrib: {
                                type: "M",
                            }
                         }
                    }
                }, tableName);

                await checkNoError(() => validator.validateUpdateObj({ set: { map: { }}}));
                await checkNoError(() => validator.validateUpdateObj({ set: { map: { stringAttrib: "Test" }}}));
            });

            it("Tests that an error is thrown if there are 'onlyAllowDefinedAttributes' is set.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        onlyAllowDefinedAttributes: true,
                        attributes: {
                            testAttrib: {
                                type: "M",
                            }
                         }
                    }
                }, tableName);

                await checkNoError(() => validator.validateUpdateObj({ set: { map: { }}}));
                await checkError(() => validator.validateUpdateObj({ set: { map: { stringAttrib: "Test" }}}));
            });

            it("Tests that nested attributes are also inspected.", async () => {
                const validator = new Validator.TableSchemaValidator<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            map: {
                                type: "M",
                                attributes: {
                                    stringAttrib: {
                                        type: "S",
                                        enum: ["One"]
                                    }
                                }
                            }
                         }
                    }
                }, tableName);
                await checkNoError(() => validator.validateUpdateObj({ set: { map: { map: { stringAttrib: "One" }}}}));
                await checkError(() => validator.validateUpdateObj({ set: { map: { map: { stringAttrib: "Two" }}}}));
            });
        });
    });
});

function checkNoError(callback: () => any | Promise<any>) {
    let caughtError: Error;
    return Promise.resolve()
        .then(() => callback())
        .catch(e => (caughtError = e))
        .then(() => {
            expect(caughtError).to.not.exist;
        });
}

function checkError(callback: () => any | Promise<any>, msg?: string) {
    let caughtError: Error;
    return Promise.resolve()
        .then(() => callback())
        .catch(e => (caughtError = e))
        .then(() => {
            expect(caughtError).to.exist;
            if (msg) {
                expect(caughtError).to.deep.equal(new Error(msg));
            }
        });
}
