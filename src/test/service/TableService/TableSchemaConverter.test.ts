import * as Chai from "chai";

import * as Schema from "../../../main/service/KeySchema";
import * as Converter from "../../../main/service/TableService/TableSchemaConverter";

const defaultSchema: Schema.TableSchema<any> = {
    primaryKey: {
        primary: true,
        type: "N"
    }
};

const expect = Chai.expect;

describe("TableSchemaConverter", () => {
    describe("ConvertObj", () => {
        it("Tests that an undefined is returned with undefined", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema
            });

            expect(converter.convertObj(undefined)).to.be.undefined;
        });

        it("Tests that an object with no policies is returned.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema
            });
            const obj = {
                primaryKey: 5,
                secondary: 4,
                stringParam: "Value"
            };
            expect(converter.convertObj(obj)).to.deep.equal(obj);
        });

        it("Tests that objects with unknown attributes are trimmed.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema
            });
            const obj = {
                primaryKey: 5,
                secondary: 4,
                stringParam: "Value"
            };
            expect(converter.convertObj(obj, { trimUnknown: true })).to.deep.equal({ primaryKey: 5 });
        });

        it("Tests that objects which are constant are trimmed when set.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema,
                secondary: {
                    type: "N",
                    constant: true
                }
            });
            const obj = {
                primaryKey: 5,
                secondary: 4
            };
            expect(converter.convertObj(obj, { trimConstants: true })).to.deep.equal({ primaryKey: 5 });
        });

        it("Tests that objects are slugged.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema,
                secondary: {
                    type: "S",
                    slugify: true
                }
            });
            const obj = {
                primaryKey: 5,
                secondary: "this is a slugged name"
            };
            expect(converter.convertObj(obj)).to.deep.equal({
                primaryKey: 5,
                secondary: "this-is-a-slugged-name"
            });
        });

        it("Tests that objects are processed.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema,
                stringValue: {
                    type: "S",
                    process: (old: string) => `${old}-New`
                }
            });
            const obj = {
                primaryKey: 5,
                stringValue: "Old"
            };
            expect(converter.convertObj(obj)).to.deep.equal({
                primaryKey: 5,
                stringValue: "Old-New"
            });
        });
    });

    describe("Convert from dynamo object.", () => {
        it("Tests that an undefined is returned as undefined.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema
            });

            expect(converter.convertObjFromDynamo(undefined)).to.be.undefined;
        });

        it("Tests that an item returned from dynamo is returned.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema
            });

            const obj = {
                primaryKey: 5,
                secondary: "This is a new one."
            };
            expect(converter.convertObjFromDynamo(obj)).to.deep.equal(obj);
        });

        it("Tests that unknown properties are trimmed if decided to be trimmed.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema
            });

            const obj = {
                primaryKey: 5,
                secondary: "This should not be seen.",
                tertiary: "This should also not be seen."
            };
            expect(converter.convertObjFromDynamo(obj as any, { trimUnknown: true })).to.deep.equal({ primaryKey: 5 });
        });

        it("Tests that ignored properties are removed if decided to be ignored.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema,
                "test1:secondary": {
                    type: "S"
                },
                "test2:tertiary": {
                    type: "S"
                }
            });

            const obj = {
                primaryKey: 5,
                "test1:secondary": "This should not be seen.",
                "test2:tertiary": "This should also not be seen."
            };
            expect(converter.convertObjFromDynamo(obj as any, { ignoreColumnsInGet: /^test1:.+/ })).to.deep.equal({
                primaryKey: 5,
                "test2:tertiary": "This should also not be seen."
            });
            expect(
                converter.convertObjFromDynamo(obj as any, { ignoreColumnsInGet: [/^test1:.+/, /^test2:.+/] })
            ).to.deep.equal({ primaryKey: 5 });
        });

        it("Tests that a date is converted from ISO to Date.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema,
                dateData: {
                    type: "Date"
                }
            });
            const date = new Date();
            const obj = {
                primaryKey: 5,
                dateData: date.toISOString()
            };
            expect(converter.convertObjFromDynamo(obj)).to.deep.equal({ primaryKey: 5, dateData: date });
        });
    });

    describe("Convert data to dynamo object.", () => {
        it("Tests that an undefined returns an undefined.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema
            });
            expect(converter.convertObjToDynamo(undefined)).to.be.undefined;
        });

        it("Converts a data object to iso.", () => {
            const converter = new Converter.TableSchemaConverter<any>({
                ...defaultSchema,
                dateItem: {
                    type: "Date"
                }
            });
            const date = new Date();
            const obj = {
                primaryKey: 5,
                dateItem: date
            };
            expect(converter.convertObjToDynamo(obj)).to.deep.equal({
                primaryKey: 5,
                dateItem: date.toISOString()
            });
        });
    });

    describe("Map objects", () => {
        describe("ConvertToDynamo", () => {
            it("Tests that a map with not defined attributes is effected.", () => {
                const converter = new Converter.TableSchemaConverter<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                    }
                });
                const obj = {
                    primaryKey: 5,
                    map: {
                        testAttribute: "Test",
                        numberAttribute: 5
                    }
                };
                expect(converter.convertObjToDynamo(obj)).to.deep.equal(obj);
            });

            it("Tests that a deep nested map with not defined attributes is effected.", () => {
                const converter = new Converter.TableSchemaConverter<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            map: {
                                type: "M"
                            }
                        }
                    }
                });
                const obj = {
                    primaryKey: 5,
                    map: {
                        map: {
                            testAttribute: "Test",
                            numberAttribute: 5
                        }
                    }
                };
                expect(converter.convertObjToDynamo(obj)).to.deep.equal(obj);
            });

            describe("Date", () => {
                it("Tests that a mapped item is properly converted.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                dateAttribute: {
                                    type: "Date"
                                }
                            }
                        }
                    });
                    const date = new Date();
                    const obj = {
                        primaryKey: 5,
                        map: {
                            dateAttribute: date
                        }
                    };
                    expect(converter.convertObjToDynamo(obj)).to.deep.equal({
                        primaryKey: 5,
                        map: {
                            dateAttribute: date.toISOString()
                        }
                    });
                });

                it("Tests that a mapped item is properly converted if the map is deep nested.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                map: {
                                    type: "M",
                                    attributes: {
                                        dateAttribute: {
                                            type: "Date"
                                        }
                                    }
                                }
                            }
                        }
                    });
                    const date = new Date();
                    const obj = {
                        primaryKey: 5,
                        map: {
                            map: {
                                dateAttribute: date
                            }
                        }
                    };
                    expect(converter.convertObjToDynamo(obj)).to.deep.equal({
                        primaryKey: 5,
                        map: {
                            map: {
                                dateAttribute: date.toISOString()
                            }
                        }
                    });
                });
            });
        });

        describe("ConvertFromDynamo", () => {
            it("Tests that a map with not defined attributes is effected.", () => {
                const converter = new Converter.TableSchemaConverter<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                    }
                });
                const obj = {
                    primaryKey: 5,
                    map: {
                        testAttribute: "Test",
                        numberAttribute: 5
                    }
                };
                expect(converter.convertObjFromDynamo(obj, {
                    trimUnknown: true
                })).to.deep.equal(obj);
            });

            it("Tests that a deep nested map with not defined attributes is effected.", () => {
                const converter = new Converter.TableSchemaConverter<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            map: {
                                type: "M"
                            }
                        }
                    }
                });
                const obj = {
                    primaryKey: 5,
                    map: {
                        map: {
                            testAttribute: "Test",
                            numberAttribute: 5
                        }
                    }
                };
                expect(converter.convertObjFromDynamo(obj, {
                    trimUnknown: true
                })).to.deep.equal(obj);
            });

            describe("Date", () => {
                it("Tests that a mapped item is properly converted.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                dateAttribute: {
                                    type: "Date"
                                }
                            }
                        }
                    });
                    const date = new Date();
                    const obj = {
                        primaryKey: 5,
                        map: {
                            dateAttribute: date.toISOString()
                        }
                    };
                    expect(converter.convertObjFromDynamo(obj)).to.deep.equal({
                        primaryKey: 5,
                        map: {
                            dateAttribute: date
                        }
                    });
                });

                it("Tests that a mapped item is properly converted if the map is deep nested.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                map: {
                                    type: "M",
                                    attributes: {
                                        dateAttribute: {
                                            type: "Date"
                                        }
                                    }
                                }
                            }
                        }
                    });
                    const date = new Date();
                    const obj = {
                        primaryKey: 5,
                        map: {
                            map: {
                                dateAttribute: date.toISOString()
                            }
                        }
                    };
                    expect(converter.convertObjFromDynamo(obj)).to.deep.equal({
                        primaryKey: 5,
                        map: {
                            map: {
                                dateAttribute: date
                            }
                        }
                    });
                });
            });
        });

        describe("Convert object", () => {
            describe("String", () => {
                it("Tests that processed strings are converted.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                stringAttrib: {
                                    type: "S",
                                    process: (old: string) => `${old}-New`
                                }
                            }
                        }
                    });
                    expect(converter.convertObj({ primaryKey: 5, map: { stringAttrib: "Old"}})).to.deep.equal({
                        primaryKey: 5,
                        map: {
                            stringAttrib: "Old-New"
                        }
                    });
                });

                it("Tests that slugified strings are converted.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                stringAttrib: {
                                    type: "S",
                                    slugify: true
                                }
                            }
                        }
                    });
                    expect(
                        converter.convertObj({ primaryKey: 5, map: { stringAttrib: "This is a test" } })
                    ).to.deep.equal({
                        primaryKey: 5,
                        map: {
                            stringAttrib: "This-is-a-test"
                        }
                    });
                });

                it("Tests that slugified items in super nested maps are converted.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                map: {
                                    type: "M",
                                    attributes: {
                                        stringAttrib: {
                                            type: "S",
                                            slugify: true
                                        }
                                    }
                                }
                            }
                        }
                    });
                    const obj = {
                        primaryKey: 5,
                        map: {
                            map: {
                                stringAttrib: "This is a test"
                            }
                        }
                    };
                    expect(converter.convertObj(obj)).to.deep.equal({
                        primaryKey: 5,
                        map: {
                            map: {
                                stringAttrib: "This-is-a-test"
                            }
                        }
                    });
                });
            });
        });

        describe("Convert Update Objects", () => {

            it("Tests that a map with not defined attributes is effected.", () => {
                const converter = new Converter.TableSchemaConverter<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                    }
                });
                const obj = {
                    set: {
                        map: {
                            testAttribute: "Test",
                            numberAttribute: 5
                        }
                    }
                };
                expect(converter.convertObjToDynamo(obj)).to.deep.equal(obj);
            });

            it("Tests that a deep nested map with not defined attributes is effected.", () => {
                const converter = new Converter.TableSchemaConverter<any>({
                    ...defaultSchema,
                    map: {
                        type: "M",
                        attributes: {
                            map: {
                                type: "M"
                            }
                        }
                    }
                });
                const obj = {
                    set: {
                        map: {
                            map: {
                                testAttribute: "Test",
                                numberAttribute: 5
                            }
                        }
                    }
                };
                expect(converter.convertObjToDynamo(obj)).to.deep.equal(obj);
            });

            describe("String", () => {
                it("Tests that a map with a processed string is processed.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                stringAttrib: {
                                    type: "S",
                                    process: (old: string) => `${old}-New`
                                }
                            }
                        }
                    });
                    const obj = {
                        set: {
                            map: {
                                stringAttrib: "Old"
                            }
                        }
                    };
                    expect(converter.convertUpdateObj(obj)).to.deep.equal({
                        set: {
                            map: {
                                stringAttrib: "Old-New"
                            }
                        }
                    });
                });

                it("Tests that slugified strings are converted.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                stringAttrib: {
                                    type: "S",
                                    slugify: true
                                }
                            }
                        }
                    });
                    const obj = {
                        set: {
                            map: {
                                stringAttrib: "This is a test"
                            }
                        }
                    };
                    expect(converter.convertUpdateObj(obj)).to.deep.equal({
                        set: {
                            map: {
                                stringAttrib: "This-is-a-test"
                            }
                        }
                    });
                });

                it("Tests that slugified strings in super nested maps are converted.", () => {
                    const converter = new Converter.TableSchemaConverter<any>({
                        ...defaultSchema,
                        map: {
                            type: "M",
                            attributes: {
                                map: {
                                    type: "M",
                                    attributes: {
                                        stringAttrib: {
                                            type: "S",
                                            slugify: true
                                        }
                                    }
                                }
                            }
                        }
                    });
                    const obj = {
                        set: {
                            map: {
                                map: {
                                    stringAttrib: "This is a test"
                                }
                            }
                        }
                    };
                    expect(converter.convertUpdateObj(obj)).to.deep.equal({
                        set: {
                            map: {
                                map: {
                                    stringAttrib: "This-is-a-test"
                                }
                            }
                        }
                    });
                });
            });
        });
    });
});
