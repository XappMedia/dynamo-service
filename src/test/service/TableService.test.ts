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
            checkError(() => {
                return new TableService.TableService(SortedTableName, dynamoService, {});
            }, new Error("Table " + SortedTableName + " must include a primary key."));
        });

        it("Tests that an error is thrown when there are two many primary keys.", () => {
            checkError(() => {
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
            checkError(() => {
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
        let tableService: TableService.TableService;

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
                await checkError(() => {
                    return tableService.put({ [sortedTable.SortKey]: createSortKey(), "requiredKey": 5 });
                });
            });

            it("Tests that the object is not put if the sort key is not included.", async () => {
                await checkError(() => {
                    return tableService.put({ [sortedTable.PrimaryKey]: createPrimaryKey(), "requiredKey": 5 });
                });
            });

            it("Tests that the object is not put if a required key is absent.", async () => {
                await checkError(() => {
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