import { DynamoDB } from "aws-sdk";
import * as Chai from "chai";
import * as SinonChai from "sinon-chai";

import * as DS from "../../main/service/DynamoService";
import * as StubObject from "../StubObject";
import * as TableUtils from "../TableUtils";

Chai.use(SinonChai);
const expect = Chai.expect;

const db: DynamoDB = new DynamoDB({
    endpoint: "http://localhost:8000",
    region: "us-east-1"
});

const client: DynamoDB.DocumentClient = new DynamoDB.DocumentClient({ service: db });

const TableName: string = "DynamoServiceTestTable";
const SortedTableName: string = "DynamoServiceSortedTestTable";

const sortKey: string = "CreatedAt";

describe("DynamoService", function () {

    this.timeout(10000);

    let service: DS.DynamoService = new DS.DynamoService(client);
    let spyDb: StubObject.SpiedObj & DynamoDB.DocumentClient;

    let testTable: TableUtils.Table;
    let sortedTable: TableUtils.Table;

    let primaryKey: number = 0;

    before(async () => {
        primaryKey = 0;
        spyDb = StubObject.spy(client);
        testTable = await TableUtils.createTable(db, TableUtils.defaultTableInput(TableName));
        sortedTable = await TableUtils.createTable(db, TableUtils.defaultTableInput(SortedTableName, { sortKey }));
    });

    beforeEach(() => {
        spyDb.reset();
    });

    afterEach(() => {
        spyDb.restore();
    });

    after(async () => {
        await testTable.delete();
    });

    function getPrimary() {
        return "" + primaryKey++;
    }

    function get(key: any) {
        return client.get({ TableName, Key: key }).promise();
    }

    describe("Put", () => {
        it("Tests that the put method gives the db the appropriate items.", async () => {
            const Item = { [testTable.PrimaryKey]: getPrimary(), Param1: "One", param2: 2 };
            await service.put(testTable.TableName, Item);
            expect(spyDb.put).to.have.been.calledWithMatch({ TableName, Item });
        });

        it("Tests that the item was put.", async () => {
            const Item = { [testTable.PrimaryKey]: getPrimary(), Param1: "One", param2: 2 };
            await service.put(testTable.TableName, Item);

            const queriedItem = await get({ [testTable.PrimaryKey]: Item[testTable.PrimaryKey] });
            expect(queriedItem.Item).to.deep.equal(Item);
        });
    });

    describe("Get", () => {
        let Key: any;
        let Item: any;

        before(async () => {
            Key = { [testTable.PrimaryKey]: getPrimary() };
            Item = { ...Key, Param1: "One", parm2: 2 };
            await client.put({ TableName, Item });
        });

        after(async () => {
            await client.delete({ TableName, Key });
        });

        it("Tests that the item is returned.", async () => {
            const item = await service.get(TableName, Key);
            expect(item).to.deep.equal(item);
        });
    });

    describe("BatchGet, Query, Scan", () => {
        const maxItems = 10;
        let primaryKey: string;
        let Keys: any[];
        let Items: any[];

        before(async () => {
            const RequestItems: DynamoDB.DocumentClient.BatchWriteItemRequestMap = { [SortedTableName]: [] };
            primaryKey = getPrimary();
            Keys = [];
            Items = [];
            for (let i = 0; i < maxItems; ++i) {
                Keys.push({ [sortedTable.PrimaryKey]: primaryKey, [sortedTable.SortKey]: new Date(2017, 11, 29, i).toISOString() });
                Items.push({ ...Keys[i], Param1: "One", param2: 2 });
                RequestItems[SortedTableName].push({
                    PutRequest: {
                        Item: Items[i]
                    }
                });
            }
            await client.batchWrite({ RequestItems }).promise();
        });

        describe("Query", () => {
            it("Tests that a query retrieves all the items input.", async () => {
                const params = {
                    KeyConditionExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": primaryKey
                    }
                };
                const items = await service.query(SortedTableName, params);
                expect(items.Items).to.be.have.length(maxItems);
            });

            it("Tests that the query gets and empty if the primary is not found.", async () => {
                const params = {
                    KeyConditionExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": "Noop"
                    }
                };
                const items = await service.query(SortedTableName, params);
                expect(items.Items).to.be.empty;
            });
        });

        describe("Scan", () => {
            it("Tests that the scan retrieves the items needed.", async () => {
                const params = {
                    FilterExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": primaryKey
                    }
                };
                const items = await service.scan(SortedTableName, params);
                expect(items.Items).to.have.length(maxItems);
            });

            it("Tests that the scan retrieves the items needed.", async () => {
                const params = {
                    FilterExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": "Noop"
                    }
                };
                const items = await service.scan(SortedTableName, params);
                expect(items.Items).to.be.empty;
            });
        });
    });
});