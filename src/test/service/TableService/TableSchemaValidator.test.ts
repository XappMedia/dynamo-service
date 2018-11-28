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
                new Validator.TableSchemaValidator(
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

        it("Tests that an error is thrown if the schema has two primary keys.", () => {
            return checkError(() => {
                new Validator.TableSchemaValidator(
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
                new Validator.TableSchemaValidator(
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
            const validator = new Validator.TableSchemaValidator(
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

        it("Tests that an error is thrown if sort key is not available", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema,
                    sortKey: {
                        type: "N",
                        sort: true
                    }
                },
                tableName
            );
            return checkNoError(() => {
                validator.validate({
                    primaryKey: 5,
                    sortKey: 4
                });
            }).then(() =>
                checkError(() => {
                    validator.validate({
                        primaryKey: 5
                    });
                })
            );
        });

        it("Tests that an error is thrown if string does not fit an enum", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema,
                    stringParam: {
                        type: "S",
                        enum: ["One"]
                    }
                },
                tableName
            );
            return checkNoError(() =>
                validator.validate({
                    primaryKey: 5,
                    stringParam: "One"
                })
            ).then(() =>
                checkError(() =>
                    validator.validate({
                        primaryKey: 5,
                        stringParam: "Two"
                    })
                )
            );
        });

        it("Tests that items with invalid characters are marked as invalid.", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema,
                    stringParam: {
                        type: "S",
                        invalidCharacters: ["-"]
                    }
                },
                tableName
            );
            return checkNoError(() =>
                validator.validate({
                    primaryKey: 5,
                    stringParam: "Test"
                })
            ).then(() =>
                checkError(() =>
                    validator.validate({
                        primaryKey: 5,
                        stringParam: "Test-Test"
                    })
                )
            );
        });

        it("Tests that items with extra keys are marked as invalid.", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema
                },
                tableName
            );
            return checkNoError(() =>
                validator.validate({
                    primaryKey: 5
                })
            ).then(() =>
                checkError(() =>
                    validator.validate({
                        primaryKey: 5,
                        invalidAttrib: "Test"
                    })
                )
            );
        });

        it("Tests that keys which are required are marked as invalid.", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema,
                    requiredKey: {
                        type: "N",
                        required: true
                    }
                },
                tableName
            );
            return checkNoError(() =>
                validator.validate({
                    primaryKey: 5,
                    requiredKey: 4
                })
            ).then(() =>
                checkError(() =>
                    validator.validate({
                        primaryKey: 5
                    })
                )
            );
        });

        it("Tests that values in the wrong format are marked as invalid.", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema,
                    formatted: {
                        type: "S",
                        format: /[0-9]./
                    }
                },
                tableName
            );
            return checkNoError(() => {
                validator.validate({
                    primaryKey: 5,
                    formatted: "1234"
                });
            }).then(() =>
                checkError(() =>
                    validator.validate({
                        primaryKey: 5,
                        formatted: "Wrong"
                    })
                )
            );
        });
    });

    describe("Validate Update Obj", () => {
        it("Tests that an error is thrown if primary key is attempted to be modified.", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S"
                    }
                },
                tableName
            );
            return checkNoError(() =>
                validator.validateUpdateObj({
                    set: { normal: "Test" }
                })
            )
                .then(() =>
                    checkError(() =>
                        validator.validateUpdateObj({
                            set: { primaryKey: 4 }
                        })
                    )
                )
                .then(() =>
                    checkError(() =>
                        validator.validateUpdateObj({
                            remove: ["primaryKey"] as any
                        })
                    )
                )
                .then(() => {
                    checkError(() =>
                        validator.validateUpdateObj({
                            append: {
                                primaryKey: [4]
                            }
                        })
                    );
                });
        });

        it("Tests that an error is thrown if sort key is attempted to be modified.", () => {
            const validator = new Validator.TableSchemaValidator(
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
            return checkNoError(() =>
                validator.validateUpdateObj({
                    set: { normal: "Test" }
                })
            )
                .then(() =>
                    checkError(() =>
                        validator.validateUpdateObj({
                            set: { sort: "Test" }
                        })
                    )
                )
                .then(() =>
                    checkError(() =>
                        validator.validateUpdateObj({
                            remove: ["sort"] as any
                        })
                    )
                )
                .then(() => {
                    checkError(() =>
                        validator.validateUpdateObj({
                            append: {
                                sort: ["Test"]
                            }
                        })
                    );
                });
        });

        it("Tests that an error is thrown if constant keys are trying to be modified", () => {
            const validator = new Validator.TableSchemaValidator(
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
            return checkNoError(() =>
                validator.validateUpdateObj({
                    set: { normal: "Test" }
                })
            )
                .then(() =>
                    checkError(() =>
                        validator.validateUpdateObj({
                            set: { constant: "Test" }
                        })
                    )
                )
                .then(() => {
                    checkError(() =>
                        validator.validateUpdateObj({
                            remove: ["constant"] as any
                        })
                    );
                })
                .then(() => {
                    checkError(() =>
                        validator.validateUpdateObj({
                            append: { constant: ["Test2"] }
                        })
                    );
                });
        });

        it("Tests that an error is thrown if a required key is removed.", () => {
            const validator = new Validator.TableSchemaValidator(
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
            return checkNoError(() =>
                validator.validateUpdateObj({
                    remove: ["normal"] as any,
                    set: { required: "Test" }
                })
            ).then(() =>
                checkError(() =>
                    validator.validateUpdateObj({
                        remove: ["required"] as any
                    })
                )
            );
        });

        it("Tests that an error is thrown if a formatted string is updated to wrong format.", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S",
                        format: /[0-9]./
                    }
                },
                tableName
            );
            return checkNoError(() =>
                validator.validateUpdateObj({
                    set: { normal: "1234" }
                })
            ).then(() =>
                checkError(() =>
                    validator.validateUpdateObj({
                        set: { normal: "Wrong" }
                    })
                )
            );
        });

        it("Tests that an error is thrown if an enum string is updated with an improper enum.", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S",
                        enum: ["One", "Two"]
                    }
                },
                tableName
            );
            return checkNoError(() =>
                validator.validateUpdateObj({
                    set: { normal: "Two" }
                })
            ).then(() =>
                checkError(() =>
                    validator.validateUpdateObj({
                        set: { normal: "Wrong" }
                    })
                )
            );
        });

        it("Tests that an error is thrown if a string with invalid character is updated with invalid characters.", () => {
            const validator = new Validator.TableSchemaValidator(
                {
                    ...defaultSchema,
                    normal: {
                        type: "S",
                        invalidCharacters: ["-"]
                    }
                },
                tableName
            );
            return checkNoError(() =>
                validator.validateUpdateObj({
                    set: { normal: "Test" }
                })
            ).then(() =>
                checkError(() =>
                    validator.validateUpdateObj({
                        set: { normal: "Test-Test" }
                    })
                )
            );
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
