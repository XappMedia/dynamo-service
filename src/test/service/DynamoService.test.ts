import { DynamoDB } from "aws-sdk";
import * as Chai from "chai";
import * as SinonChai from "sinon-chai";

import * as DS from "../../main/service/DynamoService";
import * as StubObject from "../StubObject";
import * as TableUtils from "../TableUtils";

const uuid = require("uuid4");

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

    before(async () => {
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
        return uuid();
    }

    function getSort(hour: number = 1) {
        return new Date(2018, 1, 2, hour).toISOString();
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
            console.log("Inserting", Item);
            await client.put({ TableName, Item }).promise();
        });

        after(async () => {
            await client.delete({ TableName, Key }).promise();
        });

        it("Tests that the item is returned.", async () => {
            const item = await service.get(TableName, Key);
            expect(item).to.deep.equal(Item);
        });

        it("Tests that a projection of the item is returned with a single projection.", async () => {
            const item = await service.get(TableName, Key, "Param1" as any);
            expect(item).to.deep.equal({ Param1: "One" });
        });

        it("Tests that a projection array retrieves the returned item.", async () => {
            const item = await service.get(TableName, Key, ["Param1", "parm2"] as any);
            expect(item).to.deep.equal({ Param1: "One", parm2: 2 });
        });
    });

    describe("Update", () => {
        const primaryKey: string = getPrimary();
        let Key: any;

        before(async () => {
            Key = {
                [testTable.PrimaryKey]: primaryKey
            };
            await client.put({
                TableName: testTable.TableName,
                Item: {
                    ...Key,
                    StringParam1: "One",
                    NumberParam1: 2,
                    ObjParam1: { Param: "Value" },
                    ListParam1: [1, 2, 3, 4, 5, 6]
                }
            }).promise();
        });

        it("Tests that the item is updated with an existing parameter.", async () => {
            await service.update(testTable.TableName, Key, { set: { StringParam1: "Zero" } });
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.StringParam1).to.equal("Zero");
        });

        it("Tests that the item is updated with an new parameter.", async () => {
            await service.update(testTable.TableName, Key, { set: { Param4: "Four" } });
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.Param4).to.equal("Four");
        });

        it("Tests that the item has a key removed.", async () => {
            await service.update<any>(testTable.TableName, Key, { remove: ["ObjParam1"] });
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.ObjParam1).to.be.undefined;
        });

        it("Tests that the item is appended.", async () => {
            await service.update(testTable.TableName, Key, { append: { ListParam1: [7] } });
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.ListParam1).to.have.ordered.members([1, 2, 3, 4, 5, 6, 7]);
        });

        it("Tests that the list is created if it does not exist.", async () => {
            await service.update(testTable.TableName, Key, { append: { NonExistentListParam1: [7] } });
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.NonExistentListParam1).to.have.ordered.members([7]);
        });

        it("Tests a massive change.", async () => {
            await service.update<any>(testTable.TableName, Key, {
                set: {
                    StringParam1: "MassiveChangeNewValue",
                    Param5: "Zero"
                },
                remove: ["NumberParam1"],
                append: {
                    ListParam1: [9],
                    NonExistentListParam2: [1]
                }
            });
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.StringParam1).to.equal("MassiveChangeNewValue");
            expect(updatedObj.Item.Param5).to.equal("Zero");
            expect(updatedObj.Item.NumberParam1).to.be.undefined;
            expect(updatedObj.Item.ListParam1).to.contain(9);
            expect(updatedObj.Item.NonExistentListParam2).to.contain(1);
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
                Keys.push({ [sortedTable.PrimaryKey]: primaryKey, [sortedTable.SortKey]: getSort(i) });
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