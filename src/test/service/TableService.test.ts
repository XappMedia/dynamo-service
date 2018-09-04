import { DynamoDB } from "aws-sdk";
import * as Chai from "chai";

import { DynamoService } from "../../main/service/DynamoService";
import * as TableService from "../../main/service/TableService";
import { createTable, defaultTableInput, Table } from "../TableUtils";

const uuid = require("uuid4");

const expect = Chai.expect;

const db: DynamoDB = new DynamoDB({
    endpoint: "http://localhost:8000",
    region: "us-east-1"
});

const client: DynamoDB.DocumentClient = new DynamoDB.DocumentClient({ service: db });

const UnSortedTableName: string = "DynamoServiceUnSortedTestTable";
const SortedTableName: string = "DynamoServiceSortedTestTable";

const sortKey: string = "CreatedAt";

describe("TableService", function () {

    this.timeout(15000);

    let dynamoService: DynamoService;
    let sortedTable: Table;
    let unsortedTable: Table;

    before(async () => {
        dynamoService = new DynamoService(client);
        sortedTable = await createTable(db, defaultTableInput(SortedTableName, { sortKey }));
        unsortedTable = await createTable(db, defaultTableInput(UnSortedTableName, { }));
    });

    after(async () => {
        await sortedTable.delete();
    });

    describe("Creation validation", () => {
        it("Tests that an error is thrown when primary key does not exist.", () => {
            return checkError(() => {
                return new TableService.TableService(SortedTableName, dynamoService, {});
            }, new Error("Table " + SortedTableName + " must include a primary key."));
        });

        it("Tests that an error is thrown when there are two many primary keys.", () => {
            return checkError(() => {
                return new TableService.TableService(SortedTableName, dynamoService, {
                    "key1": {
                        type: "S",
                        primary: true
                    },
                    "key2": {
                        type: "S",
                        primary: true
                    }
                });
            }, new Error("Table " + SortedTableName + " must only have one primary key."));
        });

        it("Tests that an error is thrown when there are too many sorted keys.", () => {
            return checkError(() => {
                return new TableService.TableService(SortedTableName, dynamoService, {
                    "key1": {
                        type: "S",
                        primary: true
                    },
                    "key2": {
                        type: "S",
                        sort: true
                    },
                    "key3": {
                        type: "S",
                        sort: true
                    }
                });
            }, new Error("Table " + SortedTableName + " can not have more than one sort key."));
        });
    });

    describe("Successful creation.", () => {
        let tableService: TableService.TableService<any>;
        let unsortedTableService: TableService.TableService<any>;

        function createTableService(props?: TableService.TableServiceProps) {
            const tableSchema: TableService.TableSchema = {
                [sortedTable.PrimaryKey]: {
                    type: "S",
                    primary: true
                },
                [sortedTable.SortKey]: {
                    type: "S",
                    sort: true
                },
                "requiredKey": {
                    type: "N",
                    required: true
                }
            };
            return new TableService.TableService(SortedTableName, dynamoService, tableSchema, props);
        }

        function createUnsortedTableService(props?: TableService.TableServiceProps) {
            const tableSchema: TableService.TableSchema = {
                [unsortedTable.PrimaryKey]: {
                    type: "S",
                    primary: true,
                    invalidCharacters: "<>,."
                },
                "requiredKey": {
                    type: "N",
                    required: true
                },
                "isoDateKey": {
                    type: "Date",
                    dateFormat: "ISO-8601"
                },
                "timestampDateKey": {
                    type: "Date",
                    dateFormat: "Timestamp"
                },
                "enumKey": {
                    type: "S",
                    enum: ["One", "Two"]
                },
                "sluggedKey": {
                    type: "S",
                    slugify: true
                },
                "sluggedKey2": {
                    type: "S",
                    slugify: {
                        remove: /\'/
                    }
                },
                "formatted": {
                    type: "S",
                    format: /^[a-zA-Z0-9]+-[a-zA-Z0-9]+$/
                },
                "defaultedString": {
                    type: "S",
                    default: "DefaultString"
                },
                "defaultedNumber": {
                    type: "N",
                    default: 3
                }
            };
            return new TableService.TableService(UnSortedTableName, dynamoService, tableSchema, props);
        }

        before(() => {
            tableService = createTableService();
            unsortedTableService = createUnsortedTableService();
        });

        describe("Put", () => {
            it("Tests that the object is not put if the primary key is not included.", async () => {
                return checkError(() => {
                    return tableService.put({ [sortedTable.SortKey]: createSortKey(), "requiredKey": 5 });
                });
            });

            it("Tests that the object is not put if the sort key is not included.", async () => {
                return checkError(() => {
                    return tableService.put({ [sortedTable.PrimaryKey]: createPrimaryKey(), "requiredKey": 5 });
                });
            });

            it("Tests that the object is not put if a required key is absent.", async () => {
                return checkError(() => {
                    return tableService.put({
                        [sortedTable.PrimaryKey]: createPrimaryKey(),
                        [sortedTable.SortKey]: createSortKey()
                    });
                });
            });

            it("Tests that the object is not put if key contains invalid characters.", async () => {
                let errorsPassed = 0;
                return checkError(() => {
                    return unsortedTableService.put({
                        [unsortedTable.PrimaryKey]: createPrimaryKey() + "<",
                        "requiredKey": 5
                    });
                }).then(() => {
                    ++errorsPassed;
                    return checkError(() => {
                        return unsortedTableService.put({
                            [unsortedTable.PrimaryKey]: createPrimaryKey() + ">",
                            "requiredKey": 5
                        });
                    });
                }).then(() => {
                    ++errorsPassed;
                    return checkError(() => {
                        return unsortedTableService.put({
                            [unsortedTable.PrimaryKey]: createPrimaryKey() + ",",
                            "requiredKey": 5
                        });
                    });
                }).then(() => {
                    ++errorsPassed;
                    return checkError(() => {
                        return unsortedTableService.put({
                            [unsortedTable.PrimaryKey]: createPrimaryKey() + ".",
                            "requiredKey": 5
                        });
                    });
                }).then(() => {
                    ++errorsPassed;
                    expect(errorsPassed, "The test did not iterate through each character.").to.equal(4);
                }).catch(() => {
                    ++errorsPassed;
                    expect(errorsPassed, "The test did not iterate through each character.").to.equal(4);
                });
            });

            it("Tests that we can not create an object that already has the primary.", async () => {
                const item = {
                    [unsortedTable.PrimaryKey]: createPrimaryKey(),
                    "requiredKey": 5
                };
                await unsortedTableService.put(item);
                return checkError(() => {
                    return tableService.put(item);
                });
            });

            it("Tests that we can not create an object that already has the primary and sort key.", async () => {
                const item = {
                    [sortedTable.PrimaryKey]: createPrimaryKey(),
                    [sortedTable.SortKey]: createSortKey(),
                    "requiredKey": 5
                };
                await tableService.put(item);
                return checkError(() => {
                    return tableService.put(item);
                });
            });

            it("Tests that an error is thrown if unknown keys are present and no trimming happens..", async () => {
                const pKey = createPrimaryKey();
                const sKey = new Date(2018, 1, 2).toISOString();
                const obj = {
                    [sortedTable.PrimaryKey]: pKey,
                    [sortedTable.SortKey]: sKey,
                    "requiredKey": 5,
                    "UnknownKey": "Test"
                };
                return checkError(() => {
                    return tableService.put(obj);
                });
            });

            it("Tests that the object is trimmed if there are keys that are not known and we say to trim them.", async () => {
                const pKey = createPrimaryKey();
                const sKey = new Date(2018, 1, 2).toISOString();
                const obj = {
                    [sortedTable.PrimaryKey]: pKey,
                    [sortedTable.SortKey]: sKey,
                    "requiredKey": 5,
                    "UnknownKey": "Test"
                };

                const expectedObj = {
                    ...obj
                };
                delete expectedObj["UnknownKey"];

                const tableService = createTableService({ trimUnknown: true });
                const putObj = await tableService.put(obj);
                expect(putObj).to.deep.equal(expectedObj);

                const remoteObj = await client.get({ TableName: SortedTableName, Key: { [sortedTable.PrimaryKey]: pKey, [sortedTable.SortKey]: sKey } }).promise();
                expect(remoteObj.Item).to.deep.equal(expectedObj);
            });

            it("Tests that the object throws an error if trying to set a string with wrong enum and is inserted when correct.", async () => {
                const pKey = createPrimaryKey();
                const obj = {
                    [unsortedTable.PrimaryKey]: pKey,
                    "requiredKey": 5,
                    "enumKey": "No"
                };
                await checkError(() => {
                    return unsortedTableService.put(obj);
                });
                const putObj = await unsortedTableService.put({...obj, "enumKey": "One"});
                expect(putObj).to.deep.equal({ ...obj, "enumKey": "One" });
            });

            it("Tests that the object slugs the item.", async () => {
                const pKey = createPrimaryKey();
                const obj = {
                    [unsortedTable.PrimaryKey]: pKey,
                    "requiredKey": 5,
                    "sluggedKey": "This is a slugged key"
                };
                const putObj = await unsortedTableService.put(obj);
                expect(putObj.sluggedKey).to.equal("This-is-a-slugged-key");
            });

            it("Tests that the object slugs the with the specific parameters.", async () => {
                const pKey = createPrimaryKey();
                const obj = {
                    [unsortedTable.PrimaryKey]: pKey,
                    "requiredKey": 5,
                    "sluggedKey2": "'This' 'is' 'a' 'slugged' 'key'"
                };
                const putObj = await unsortedTableService.put(obj);
                expect(putObj.sluggedKey2).to.equal("This-is-a-slugged-key");
            });

            it("Tests that a formatted object is errored if not in the correct format.", async () => {
                const pKey = createPrimaryKey();
                const obj = {
                    [unsortedTable.PrimaryKey]: pKey,
                    "requiredKey": 5,
                    "formatted": "Not$In$The$Correct$Format"
                };
                await checkError(() => {
                    return unsortedTableService.put(obj);
                });
            });

            it("Tests that a formatted object is inserted if it does fit the correct format.", async () => {
                const pKey = createPrimaryKey();
                const obj = {
                    [unsortedTable.PrimaryKey]: pKey,
                    "requiredKey": 5,
                    "formatted": "this-fits"
                };
                const putObj = await unsortedTableService.put(obj);
                expect(putObj.formatted).to.equal("this-fits");
            });
        });

        describe("PutAll", () => {
            it("Tests that an error is thrown if one of the items does not contain the required it.", () => {
                const items: any[] = [];
                for (let i = 0; i < 5; ++i) {
                    items.push({
                        [unsortedTable.PrimaryKey]: createPrimaryKey(),
                        "requiredKey": 5
                    });
                }
                delete items[3]["requiredKey"];
                return checkError(() => {
                    return unsortedTableService.putAll(items);
                });
            });

            it("Tests that an error is thrown if one of the items contains an invalid character.", () => {
                const items: any[] = [];
                for (let i = 0; i < 5; ++i) {
                    items.push({
                        [unsortedTable.PrimaryKey]: createPrimaryKey(),
                        "requiredKey": 5
                    });
                }
                items[3][unsortedTable.PrimaryKey] = items[3][unsortedTable.PrimaryKey] + "<";
                return checkError(() => {
                    return unsortedTableService.putAll(items);
                });
            });

            it("Tests that an error is thrown if one of the items contains an bad enum value.", () => {
                const items: any[] = [];
                for (let i = 0; i < 5; ++i) {
                    items.push({
                        [unsortedTable.PrimaryKey]: createPrimaryKey(),
                        "requiredKey": 5
                    });
                }
                items[3]["enumKey"] = "No";
                return checkError(() => {
                    return unsortedTableService.putAll(items);
                });
            });

            it("Tests that all the items were put.", async () => {
                const items: any[] = [];
                for (let i = 0; i < 5; ++i) {
                    items.push({
                        [unsortedTable.PrimaryKey]: createPrimaryKey(),
                        "requiredKey": 5,
                        "sluggedKey": "This is a slugged item"
                    });
                }
                await unsortedTableService.putAll(items);
                let count = 0;
                for (let item of items) {
                    const found = await client.get({ TableName: UnSortedTableName, Key: { [unsortedTable.PrimaryKey]: item[unsortedTable.PrimaryKey] }}).promise();
                    expect(found.Item).to.deep.equal({...item, sluggedKey: "This-is-a-slugged-item"});
                    count++;
                }
                expect(count).to.equal(items.length);
            });

            it("Tests that an error is thrown if one of the items contains a misformatted value.", () => {
                const items: any[] = [];
                for (let i = 0; i < 5; ++i) {
                    items.push({
                        [unsortedTable.PrimaryKey]: createPrimaryKey(),
                        "requiredKey": 5
                    });
                }
                items[3]["formatted"] = "Nupe";
                return checkError(() => {
                    return unsortedTableService.putAll(items);
                });
            });
        });

        describe("Get", () => {
            const pKey = createPrimaryKey();
            const sKey = createSortKey();
            let tableService: TableService.TableService<any>;
            let testObj: any;
            let awsTestObj: any;

            before(async () => {
                tableService = createTableService({
                    ignoreColumnsInGet: TableService.AWS_COLUMN_REGEX
                });
                testObj = {
                    [sortedTable.PrimaryKey]: pKey,
                    [sortedTable.SortKey]: sKey,
                    "requiredKey": 5,
                };
                awsTestObj = {
                    ...testObj,
                    "aws:rep:updateItem": 1,
                    "aws:rep:deleteItem": 2,
                };
                await client.put({ TableName: SortedTableName, Item: awsTestObj }).promise();
            });

            it("Tests that item is got and that AWS objects are removed..", async () => {
                const obj = await tableService.get({
                    [sortedTable.PrimaryKey]: pKey,
                    [sortedTable.SortKey]: sKey
                });

                expect(obj).to.deep.equal(testObj);
            });

            it("Tests that undefined is returned if the item was not found.", async () => {
                const obj = await tableService.get({
                    [sortedTable.PrimaryKey]: "NotFoundKey",
                    [sortedTable.SortKey]: sKey
                });
                expect(obj).to.be.undefined;
            });
        });

        describe("Query", () => {
            let tableService: TableService.TableService<any>;
            let pKey = createPrimaryKey();
            let sKeys: string[] = [];
            let testObjs: any[] = [];
            for (let i = 0; i < 10; ++i) {
                sKeys.push(createSortKey(i));
            }

            before(async () => {
                tableService = createTableService({
                    ignoreColumnsInGet: TableService.AWS_COLUMN_REGEX
                });
                for (let sKey of sKeys) {
                    const testObj = {
                        [sortedTable.PrimaryKey]: pKey,
                        [sortedTable.SortKey]: sKey,
                        "requiredKey": 5
                    };
                    const awsObj = {
                        ...testObj,
                        "aws:rep:updateItem": 1,
                        "aws:rep:deleteItem": 2,
                    };
                    await client.put({ TableName: SortedTableName, Item: awsObj }).promise();
                    testObjs.push(testObj);
                }
            });

            it("Tests that the test objects are queried with ignored columns removed.", async () => {
                const params = {
                    KeyConditionExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": sortedTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": pKey
                    }
                };
                const objs = await tableService.query(params);
                expect(objs.Items).to.have.deep.members(testObjs);
            });
        });

        describe("Update", () => {
            let pKey = createPrimaryKey();
            let sKey = createSortKey();
            let Key: any;
            let testObj: any;
            let tableSchema: TableService.TableSchema;
            let tableService: TableService.TableService<any>;

            before(() => {
                Key = {
                    [sortedTable.PrimaryKey]: pKey,
                    [sortedTable.SortKey]: sKey
                };
                testObj = {
                    ...Key,
                    stringParam1: "Value1",
                    numberParam1: 5,
                    objParam1: { stringParam1: "Value1" },
                    listParam1: [1, 2, 3, 4, 5]
                };

                tableSchema = {
                    [sortedTable.PrimaryKey]: {
                        primary: true,
                        type: "S"
                    },
                    [sortedTable.SortKey]: {
                        sort: true,
                        type: "S"
                    },
                    stringParam1: {
                        type: "S"
                    },
                    numberParam1: {
                        type: "N"
                    },
                    objParam1: {
                        type: "M"
                    },
                    listParam1: {
                        type: "L"
                    }
                };
                tableService = new TableService.TableService(SortedTableName, new DynamoService(db), tableSchema);
            });

            beforeEach(async () => {
                await client.put({ TableName: SortedTableName, Item: testObj }).promise();
            });

            describe("Constant restriction tests.", () => {
                let schema: TableService.TableSchema;
                let tableService: TableService.TableService<any>;

                before(() => {
                    schema = {
                        ...tableSchema,
                        stringParam1: {
                            ...tableSchema.stringParam1,
                            constant: true
                        },
                        listParam1: {
                            ...tableSchema.listParam1,
                            constant: true
                        }
                    };
                    tableService = new TableService.TableService(SortedTableName, dynamoService, schema);
                });

                it("Tests that an error is thrown with constant restrictions when trying to set it.", async () => {
                    return checkError(() => {
                        return tableService.update(Key, { set: { stringParam1: "NewValue" } });
                    });
                });

                it("Tests that an error is thrown with constant restrictions when trying to remove it.", async () => {
                    return checkError(() => {
                        return tableService.update(Key, { remove: ["stringParam1"] });
                    });
                });

                it("Tests that an error is thrown with constant restrictions when trying to append it.", async () => {
                    return checkError(() => {
                        return tableService.update(Key, { append: { listParam1: [6] } });
                    });
                });

                it("Tests that the item is updated if 'trimConstants' is true.", async () => {
                    const newService = new TableService.TableService(SortedTableName, dynamoService, schema, { trimConstants: true });
                    const updated: any = await newService.update(Key, { set: { stringParam1: "Update", numberParam1: 8 }}, "ALL_NEW");
                    expect(updated.stringParam1).to.equal(testObj.stringParam1);
                    expect(updated.numberParam1).to.equal(8);
                });

                it("Tests that the string param is not removed if 'trimConstants' is true.", async () => {
                    const newService = new TableService.TableService(SortedTableName, dynamoService, schema, { trimConstants: true });
                    const updated: any = await newService.update(Key, { remove: ["stringParam1", "numberParam1"] as any}, "ALL_NEW");
                    expect(updated.stringParam1).to.equal(testObj.stringParam1);
                    expect(updated.numberParam1).to.not.exist;
                });

                it("Tests that the list param is not appended to if 'trimConstants' is true.", async () => {
                    const newService = new TableService.TableService(SortedTableName, dynamoService, schema, { trimConstants: true });
                    const updated: any = await newService.update(Key, { append: { "listParam1": [7]}}, "ALL_NEW");
                    expect(updated.listParam1).to.deep.equal(testObj.listParam1);
                });
            });

            describe("IgnoredGetColumns", () => {
                let schema: TableService.TableSchema;
                let tableService: TableService.TableService<any>;
                let awsItems = {
                    "aws:rep:updateItem": 1,
                    "aws:rep:deleteItem": 2,
                };

                before(() => {
                    schema = {
                        ...tableSchema,
                    };
                    tableService = new TableService.TableService(SortedTableName, dynamoService, schema, {
                        ignoreColumnsInGet: TableService.AWS_COLUMN_REGEX
                    });
                });

                beforeEach(async () => {
                    const Item = { ...testObj, ...awsItems };
                    await client.put({ TableName: SortedTableName, Item }).promise();
                });

                it("Tests that items returned from ALL_NEW do not have the AWS columns", async () => {
                    const updated = await tableService.update(Key, { set: { numberParam1: 11 }}, "ALL_NEW");
                    expect(updated).to.deep.equal({
                        ...testObj,
                        numberParam1: 11
                    });
                });
            });

            describe("Required", () => {
                let schema: TableService.TableSchema;
                let tableService: TableService.TableService<any>;

                before(() => {
                    schema = {
                        ...tableSchema,
                        stringParam1: {
                            ...tableSchema.stringParam1,
                            required: true,
                        }
                    };
                    tableService = new TableService.TableService(SortedTableName, dynamoService, schema);
                });

                it("Tests that an error is thrown if the user tries to remove a required object.", async () => {
                    return checkError(() => {
                        return tableService.update(Key, { remove: [ "stringParam1" ]});
                    });
                });
            });

            describe("InvalidCharacters", () => {
                let schema: TableService.TableSchema;
                let tableService: TableService.TableService<any>;

                before(() => {
                    schema = {
                        ...tableSchema,
                        stringParam1: {
                            type: "S",
                            invalidCharacters: "<,"
                        }
                    };
                    tableService = new TableService.TableService(SortedTableName, dynamoService, schema);
                });

                it("Tests that an error is thrown if trying to update a string parameter with invalid characters", async () => {
                    let checkedCharacters = 0;
                    return checkError(() => {
                        return tableService.update(Key, { set: { "stringParam1": "invalid<"}});
                    }).then(() => {
                        ++checkedCharacters;
                        return checkError(() => {
                            return tableService.update(Key, { set: { "stringParam1": "invalid,"}});
                        });
                    }).then(() => {
                        ++checkedCharacters;
                        expect(checkedCharacters, "The test did not iterate through each character.").to.equal(2);
                    });
                });
            });

            describe("EnumParam", () => {
                let schema: TableService.TableSchema;
                let tableService: TableService.TableService<any>;

                before(() => {
                    schema = {
                        ...tableSchema,
                        stringParam1: {
                            type: "S",
                            enum: ["One", "Two"]
                        }
                    };
                    tableService = new TableService.TableService(SortedTableName, dynamoService, schema);
                });

                it("Tests that an error is thrown if trying to set the string parameter to a value it's not allowed.", () => {
                    return checkError(() => {
                        return tableService.update(Key, { set: { stringParam1: "No" }});
                    });
                });

                it("Tests that the parameter is set if changing to another enum.", async () => {
                    const obj = await tableService.update(Key, { set: { stringParam1: "Two" }}, "ALL_NEW");
                    expect(obj).to.deep.equal({ ...testObj, stringParam1: "Two" });
                });
            });

            describe("Slugify", () => {
                let schema: TableService.TableSchema;
                let tableService: TableService.TableService<any>;

                before(() => {
                    schema = {
                        ...tableSchema,
                        stringParam1: {
                            type: "S",
                            slugify: true
                        },
                        stringParam2: {
                            type: "S",
                            slugify: {
                                remove: /\'/
                            }
                        }
                    };
                    tableService = new TableService.TableService(SortedTableName, dynamoService, schema);
                });

                it("Tests that the parameter was slugged.", async () => {
                    const obj = await tableService.update(Key, { set: { stringParam1: "This is a string" }}, "ALL_NEW");
                    expect(obj.stringParam1).to.equal("This-is-a-string");
                });

                it("Tests that the parameter was slugged with items removed.", async () => {
                    const obj = await tableService.update(Key, { set: { stringParam2: "'This' 'is' 'a' 'string'" }}, "ALL_NEW");
                    expect(obj.stringParam2).to.equal("This-is-a-string");
                });
            });

            describe("Formatted", () => {
                let schema: TableService.TableSchema;
                let tableService: TableService.TableService<any>;

                before(() => {
                    schema = {
                        ...tableSchema,
                        formatted: {
                            type: "S",
                            format: /^[a-zA-Z0-9]+-[a-zA-Z0-9]+$/
                        }
                    };
                    tableService = new TableService.TableService(SortedTableName, dynamoService, schema);
                });

                it("Tests that an error is thrown if trying to update an item with the incorrect format.", () => {
                    return checkError(() => {
                        return tableService.update(Key, { set: { formatted: "Nope" }});
                    });
                });

                it("Tests that the item is updated if it fits the format.", async () => {
                    const obj = await tableService.update(Key, { set: { formatted: "this-fits" }}, "ALL_NEW");
                    expect(obj.formatted).to.equal("this-fits");
                });
            });

            it("Tests that an error is thrown when the primary key is attempted to be modified.", async () => {
                return checkError(() => {
                    return tableService.update(Key, { set: { [sortedTable.PrimaryKey]: "NewValue" } });
                });
            });

            it("Tests that an error is thrown when the sort key is attempted to be modified.", async () => {
                return checkError(() => {
                    return tableService.update(Key, { set: { [sortedTable.SortKey]: "New Value"}});
                });
            });

            it("Tests that the object is updated with no restrictions.", async () => {
                const set = {
                    stringParam1: "NewValue",
                    numberParam1: 10,
                };
                const remove = [
                    "objParam1"
                ];
                const append = {
                    listParam1: [6]
                };
                await tableService.update(Key, { set, remove, append });
                const expected = {
                    ...Key,
                    stringParam1: "NewValue",
                    numberParam1: 10,
                    listParam1: [1, 2, 3, 4, 5, 6]
                };
                const updatedObj = await client.get({ TableName: SortedTableName, Key }).promise();
                expect(updatedObj.Item).to.deep.equal(expected);
            });

            it("Tests that a nested object with null works.", async () => {
                // tslint:disable:no-null-keyword
                const set = {
                    objParam1: {
                        doesNotExist: null as any,
                        nested: {
                            doesNotExist: null as any,
                            doesExist: {
                                hello: "world"
                            }
                        }
                    }
                };
                // tslint:enable:no-null-keyword
                await tableService.update(Key, { set });
                const expected = {
                    nested: {
                        doesExist: {
                            hello: "world"
                        }
                    }
                };
                const updatedObj = await client.get({ TableName: SortedTableName, Key }).promise();
                expect(updatedObj.Item.objParam1).to.deep.equal(expected);
            });
        });

        describe("Scan", () => {
            let tableService: TableService.TableService<any>;
            let pKey = createPrimaryKey();
            let sKeys: string[] = [];
            let testObjs: any[] = [];
            for (let i = 0; i < 10; ++i) {
                sKeys.push(createSortKey(i));
            }

            before(async () => {
                tableService = createTableService({
                    ignoreColumnsInGet: TableService.AWS_COLUMN_REGEX
                });
                for (let sKey of sKeys) {
                    const testObj = {
                        [sortedTable.PrimaryKey]: pKey,
                        [sortedTable.SortKey]: sKey,
                        "requiredKey": 5
                    };
                    const awsObj = {
                        ...testObj,
                        "aws:rep:updateItem": 1,
                        "aws:rep:deleteItem": 2,
                    };
                    await client.put({ TableName: SortedTableName, Item: awsObj }).promise();
                    testObjs.push(testObj);
                }
            });

            it("Tests that the test objects are queried.", async () => {
                const params = {
                    FilterExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": sortedTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": pKey
                    }
                };
                const objs = await tableService.scan(params);
                expect(objs.Items).to.have.deep.members(testObjs);
            });
        });

        describe("Delete", () => {
            const pKey = createPrimaryKey();
            const sKey = createSortKey();
            let testObj: any;

            before(async () => {
                testObj = {
                    [sortedTable.PrimaryKey]: pKey,
                    [sortedTable.SortKey]: sKey,
                    "requiredKey": 5
                };
                await client.put({ TableName: SortedTableName, Item: testObj }).promise();
            });

            it("Tests that the item is deleted.", async () => {
                await tableService.delete({ [sortedTable.PrimaryKey]: pKey, [sortedTable.SortKey]: sKey });
                const foundObj = await client.get({ TableName: SortedTableName, Key: {[sortedTable.PrimaryKey]: pKey, [sortedTable.SortKey]: sKey} }).promise();
                expect(foundObj.Item).to.be.undefined;
            });
        });
    });

    describe("Property Conversions", () => {
        it("Tests that the date is converted to ISO format when specified.", async () => {
            const tableSchema: TableService.TableSchema = {
                [unsortedTable.PrimaryKey]: {
                    type: "S",
                    primary: true
                },
                "dateKey": {
                    type: "Date",
                    dateFormat: "ISO-8601"
                }
            };
            const service = new TableService.TableService(UnSortedTableName, dynamoService, tableSchema);
            const pKey = createPrimaryKey();
            const objToInsert = {
                [unsortedTable.PrimaryKey]: pKey,
                dateKey: new Date(2018, 1, 1)
            };
            await service.put(objToInsert);
            const returnObj = await client.get({ TableName: UnSortedTableName, Key: {[unsortedTable.PrimaryKey]: pKey }}).promise();
            expect(returnObj.Item["dateKey"]).to.deep.equal(new Date(2018, 1, 1).toISOString());
        });

        it("Tests that the date iso is converted back when getting object.", async () => {
            const tableSchema: TableService.TableSchema = {
                [unsortedTable.PrimaryKey]: {
                    type: "S",
                    primary: true
                },
                "dateKey": {
                    type: "Date",
                    dateFormat: "ISO-8601"
                }
            };
            const service = new TableService.TableService(UnSortedTableName, dynamoService, tableSchema);
            const pKey = createPrimaryKey();
            const objToInsert = {
                [unsortedTable.PrimaryKey]: pKey,
                dateKey: new Date(2018, 1, 1).toISOString()
            };
            await client.put({ TableName: UnSortedTableName, Item: objToInsert }).promise();
            const returnObj = await service.get({ [unsortedTable.PrimaryKey]: pKey });
            expect(returnObj).to.deep.equal({
                [unsortedTable.PrimaryKey]: pKey,
                dateKey: new Date(2018, 1, 1) });
        });

        it("Tests that a query converts the date iso back to a date object.", async () => {
            const tableSchema: TableService.TableSchema = {
                [unsortedTable.PrimaryKey]: {
                    type: "S",
                    primary: true
                },
                "dateKey": {
                    type: "Date",
                    dateFormat: "ISO-8601"
                }
            };
            const service = new TableService.TableService(UnSortedTableName, dynamoService, tableSchema);
            const pKey = createPrimaryKey();
            const objToInsert = {
                [unsortedTable.PrimaryKey]: pKey,
                dateKey: new Date(2018, 1, 1).toISOString()
            };
            await client.put({ TableName: UnSortedTableName, Item: objToInsert }).promise();
            const returnObj = await service.query({ KeyConditionExpression: unsortedTable.PrimaryKey + "=:a1", ExpressionAttributeValues: { ":a1": pKey } });
            expect(returnObj.Items).to.deep.equal([{
                [unsortedTable.PrimaryKey]: pKey,
                dateKey: new Date(2018, 1, 1)
            }]);
        });

        it("Tests that a scan converts the date iso back to a date object.", async () => {
            const tableSchema: TableService.TableSchema = {
                [unsortedTable.PrimaryKey]: {
                    type: "S",
                    primary: true
                },
                "dateKey": {
                    type: "Date",
                    dateFormat: "ISO-8601"
                }
            };
            const service = new TableService.TableService(UnSortedTableName, dynamoService, tableSchema);
            const pKey = createPrimaryKey();
            const objToInsert = {
                [unsortedTable.PrimaryKey]: pKey,
                dateKey: new Date(2018, 1, 1).toISOString()
            };
            await client.put({ TableName: UnSortedTableName, Item: objToInsert }).promise();
            const returnObj = await service.scan({ FilterExpression: unsortedTable.PrimaryKey + "=:a1", ExpressionAttributeValues: { ":a1": pKey } });
            expect(returnObj.Items).to.deep.equal([{
                [unsortedTable.PrimaryKey]: pKey,
                dateKey: new Date(2018, 1, 1)
            }]);
        });
    });
});

async function checkError(run: () => any | Promise<any>, error?: Error) {
    let caughtError: Error;
    let caughtValue: any;
    try {
        caughtValue = await run();
    } catch (e) {
        caughtError = e;
    }
    expect(caughtError, "An error was not thrown.").to.exist;
    if (error) {
        expect(caughtError.message).to.equal(error.message);
    }
    expect(caughtValue, "The function returned a value.").to.be.undefined;
}

function createSortKey(hour: number = 1) {
    return new Date(2017, 1, 1, hour).toISOString();
}

function createPrimaryKey() {
    return uuid();
}