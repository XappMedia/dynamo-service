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

const SortedTableName: string = "DynamoServiceSortedTestTable";

const sortKey: string = "CreatedAt";

describe("TableService", () => {

    let dynamoService: DynamoService;
    let sortedTable: Table;

    before(async () => {
        dynamoService = new DynamoService(client);
        sortedTable = await createTable(db, defaultTableInput(SortedTableName, { sortKey }));
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

        before(() => {
            tableService = createTableService();
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

            it("Tests that the object is put to the database and not trimmed by default.", async () => {
                const pKey = createPrimaryKey();
                const sKey = new Date(2018, 1, 2).toISOString();
                const obj = {
                    [sortedTable.PrimaryKey]: pKey,
                    [sortedTable.SortKey]: sKey,
                    "requiredKey": 5,
                    "UnknownKey": "Test"
                };
                const putObj = await tableService.put(obj);
                expect(putObj).to.deep.equal(obj);

                const remoteObj = await client.get({ TableName: SortedTableName, Key: { [sortedTable.PrimaryKey]: pKey, [sortedTable.SortKey]: sKey } }).promise();
                expect(remoteObj.Item).to.deep.equal(obj);
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
        });

        describe("Get", () => {
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

            it("Tests that item is got.", async () => {
                const obj = await tableService.get({
                    [sortedTable.PrimaryKey]: pKey,
                    [sortedTable.SortKey]: sKey
                });

                expect(obj).to.deep.equal(testObj);
            });
        });

        describe("Query", () => {
            let pKey = createPrimaryKey();
            let sKeys: string[] = [];
            let testObjs: any[] = [];
            for (let i = 0; i < 10; ++i) {
                sKeys.push(createSortKey(i));
            }

            before(async () => {
                for (let sKey of sKeys) {
                    const testObj = {
                        [sortedTable.PrimaryKey]: pKey,
                        [sortedTable.SortKey]: sKey,
                        "requiredKey": 5
                    };
                    await client.put({ TableName: SortedTableName, Item: testObj }).promise();
                    testObjs.push(testObj);
                }
            });

            it("Tests that the test objects are queried.", async () => {
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
            });

            describe("Required", () => {
                let schema: TableService.TableSchema;
                let tableService: TableService.TableService<any>;

                before(() => {
                    schema = {
                        ...tableSchema,
                        stringParam1: {
                            ...tableSchema.stringParam1,
                            required: true
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
        });

        describe("Scan", () => {
            let pKey = createPrimaryKey();
            let sKeys: string[] = [];
            let testObjs: any[] = [];
            for (let i = 0; i < 10; ++i) {
                sKeys.push(createSortKey(i));
            }

            before(async () => {
                for (let sKey of sKeys) {
                    const testObj = {
                        [sortedTable.PrimaryKey]: pKey,
                        [sortedTable.SortKey]: sKey,
                        "requiredKey": 5
                    };
                    await client.put({ TableName: SortedTableName, Item: testObj }).promise();
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
});

async function checkError(run: () => any | Promise<any>, error?: Error) {
    let caughtError: Error;
    let caughtValue: any;
    try {
        caughtValue = await run();
    } catch (e) {
        caughtError = e;
    }
    expect(caughtError).to.exist;
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