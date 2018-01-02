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

describe.only("TableService", () => {

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

        before(() => {
            tableService = new TableService.TableService(SortedTableName, dynamoService, {
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
            });
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

            it("Tests that the object is put to the database.", async () => {
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

function createSortKey() {
    return new Date(2017, 1, 1).toISOString();
}

function createPrimaryKey() {
    return uuid();
}