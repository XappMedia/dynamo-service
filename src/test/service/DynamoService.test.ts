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

        it("Tests that the item fails to put on condition.", async () => {
            const condition = {
                ConditionExpression: "attribute_not_exists(" + testTable.PrimaryKey + ")"
            };
            const Item = { [testTable.PrimaryKey]: getPrimary(), Param1: "One", param2: 2 };
            await service.put(testTable.TableName, Item, condition);

            const queriedItem = await get({ [testTable.PrimaryKey]: Item[testTable.PrimaryKey] });
            expect(queriedItem.Item).to.deep.equal(Item);

            let caughtError: Error;
            try {
                await service.put(testTable.TableName, Item, condition);
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.exist;
        });
    });

    describe("Mass Put", () => {
        it("Tests that all the items are input.", async () => {
            const items: any[] = [];
            const Keys: any[] = [];
            for (let i = 0; i < 50; i++) {
                const newKey = { [testTable.PrimaryKey]: getPrimary(), };
                Keys.push(newKey);
                items.push({
                    ...newKey, Param1: "One", param2: 2
                });
            }
            await service.put(testTable.TableName, items);
            let count = 0;
            for (let key of Keys) {
                const found = await get(key);
                expect(found).to.exist;
                expect(found.Item).to.deep.equal({ ...key, Param1: "One", param2: 2 });
                ++count;
            }
            expect(count).to.equal(Keys.length);
        });
    });

    describe("Get", () => {
        let Key: any;
        let Key2: any;
        let Item: any;
        let Item2: any;

        before(async () => {
            Key = { [testTable.PrimaryKey]: getPrimary() };
            Key2 = { [testTable.PrimaryKey]: getPrimary() };
            Item = { ...Key, Param1: "One", parm2: 2 };
            Item2 = { ...Key2, Param1: "One2", parm2: 22 };
            await client.put({ TableName, Item }).promise();
            await client.put({ TableName, Item: Item2 }).promise();
        });

        after(async () => {
            await client.delete({ TableName, Key }).promise();
            await client.delete({ TableName, Key: Key2 }).promise();
        });

        it("Tests that the item is returned.", async () => {
            const item = await service.get(TableName, Key);
            expect(item).to.deep.equal(Item);
        });

        it("Tests that both items are returned.", async () => {
            const item = await service.get(TableName, [Key, Key2]);
            expect(item).to.deep.include.members([Item, Item2]);
        });

        it("Tests that a projection of the item is returned with a single projection.", async () => {
            const item = await service.get(TableName, Key, "Param1" as any);
            expect(item).to.deep.equal({ Param1: "One" });
        });

        it("Tests that a projection array retrieves the returned item.", async () => {
            const item = await service.get(TableName, Key, ["Param1", "parm2"] as any);
            expect(item).to.deep.equal({ Param1: "One", parm2: 2 });
        });

        it("Tests that a projection array retrieves the return items when searching for multiple.", async () => {
            const item = await service.get(TableName, [Key, Key2], ["Param1", "parm2"] as any);
            expect(item).to.deep.include.members([{ Param1: "One", parm2: 2}, { Param1: "One2", parm2: 22 }]);
        });
    });

    describe("Update", () => {
        const primaryKey: string = getPrimary();
        let Item: any;
        let Key: any;

        beforeEach(async () => {
            Key = {
                [testTable.PrimaryKey]: primaryKey
            };
            Item = {
                ...Key,
                        StringParam1: "One",
                        NumberParam1: 2,
                        ObjParam1: { Param: "Value" },
                        ListParam1: [1, 2, 3, 4, 5, 6]
            };
            await client.put({
                TableName: testTable.TableName,
                Item
            }).promise();
        });

        it("Tests that the item is updated with an existing parameter.", async () => {
            await service.update(testTable.TableName, Key, { set: { StringParam1: "Zero" } });
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.StringParam1).to.equal("Zero");
        });

        it("Tests that the item returned is updated with an existing parameter.", async () => {
            const newItem = await service.update(testTable.TableName, Key, { set: { StringParam1: "Zero" } }, "ALL_NEW");
            const updatedItem = {
                ...Item,
                StringParam1: "Zero"
            };
            expect(newItem).to.deep.equal(updatedItem);
        });

        it("Tests that the item returned is only the updated attributes.", async () => {
            const newItem = await service.update(testTable.TableName, Key, { set: { StringParam1: "Zero" } }, "UPDATED_NEW");
            const updatedItem = {
                StringParam1: "Zero"
            };
            expect(newItem).to.deep.equal(updatedItem);
        });

        it("Tests that setting an attribute to undefined will remove it.", async () => {
            await service.update(testTable.TableName, Key, { set: { StringParam1: undefined } });
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.StringParam1).to.not.exist;
        });

        it("Tests that setting an attribute to blank will remove it.", async () => {
            await service.update(testTable.TableName, Key, { set: { StringParam1: "" } });
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.StringParam1).to.not.exist;
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

        it("Tests that an empty string is allowed to be set in an object.", async () => {
            await service.update(testTable.TableName, Key, { set: { ObjParam1: { Param: "", Param2: "Test" }}});
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.ObjParam1).to.deep.equal({ Param2: "Test" });
        });

        it("Tests that an array is set.", async () => {
            const arr = ["One", "Two", "Three", "", "  ", { Param1: "", Param2: "One", Param3: { Param1: "", Param2: "Two" }, param4: {}}, ["One", "Two", ""]];
            const expected = ["One", "Two", "Three", "  ", { Param2: "One", Param3: { Param2: "Two" }, param4: {}}, ["One", "Two"]];
            await service.update(testTable.TableName, Key, { set: { arrParam1: arr }});
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.arrParam1).to.deep.equal(expected);
        });

        it("Tests that an null object is not turned to an object.", async () => {
            // tslint:disable:no-null-keyword
            const updateObj = {
                set: {
                    ObjParam1: {
                        Param: {
                            item: null as any,
                            item2: "Test"
                        },
                        Param2: "Test"
                    }
                }
            };
            // tslint:enable:no-null-keyword
            const expected = { Param: { item2: "Test" }, Param2: "Test" };
            await service.update(testTable.TableName, Key, updateObj);
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item.ObjParam1).to.deep.equal(expected);
        });

        it("Tests that a condition expression is included.", async () => {
            const ConditionExpression = {
                ConditionExpression: "#id = :id",
                ExpressionAttributeNames: {
                    "#id": testTable.PrimaryKey
                },
                ExpressionAttributeValues: {
                    ":id": primaryKey
                }
            };
            await service.update(testTable.TableName, Key, { set: { Param5: "Five" }}, ConditionExpression);
            const updatedObj = await client.get({ TableName: testTable.TableName, Key }).promise();
            expect(updatedObj.Item).to.have.property("Param5", "Five");
        });

        it("Tests that the item returned is updated with an existing parameter and condition.", async () => {
            const ConditionExpression = {
                ConditionExpression: "#id = :id",
                ExpressionAttributeNames: {
                    "#id": testTable.PrimaryKey
                },
                ExpressionAttributeValues: {
                    ":id": primaryKey
                }
            };
            const newItem = await service.update(testTable.TableName, Key, { set: { StringParam1: "Zero" } }, ConditionExpression, "ALL_NEW");
            const updatedItem = {
                ...Item,
                StringParam1: "Zero"
            };
            expect(newItem).to.deep.equal(updatedItem);
        });

        it("Tests that the item returned is only the updated attributes.", async () => {
            const ConditionExpression = {
                ConditionExpression: "#id = :id",
                ExpressionAttributeNames: {
                    "#id": testTable.PrimaryKey
                },
                ExpressionAttributeValues: {
                    ":id": primaryKey
                }
            };
            const newItem = await service.update(testTable.TableName, Key, { set: { StringParam1: "Zero" } }, ConditionExpression, "UPDATED_NEW");
            const updatedItem = {
                StringParam1: "Zero"
            };
            expect(newItem).to.deep.equal(updatedItem);
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

            it("Tests that all objects are retrieved with the projection.", async () => {
                const params = {
                    KeyConditionExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": primaryKey
                    }
                };
                const items = await service.query(SortedTableName, params, "Param1" as any);
                expect(items.Items).to.have.length(maxItems);
                for (let item of items.Items) {
                    expect(item).to.have.property("Param1");
                    expect(item).to.not.have.property("param2");
                }
            });

            it("Tests that all objects are retrieved with the projection.", async () => {
                const params = {
                    KeyConditionExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": primaryKey
                    }
                };
                const items = await service.query(SortedTableName, params, "Param1" as any);
                expect(items.Items).to.have.length(maxItems);
                for (let item of items.Items) {
                    expect(item).to.have.property("Param1");
                    expect(item).to.not.have.property("param2");
                    expect(item).to.not.have.property(sortedTable.PrimaryKey);
                    expect(item).to.not.have.property(sortedTable.SortKey);
                }
            });

            it("Tests that all objects are retrieved with the array projection.", async () => {
                const params = {
                    KeyConditionExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": primaryKey
                    }
                };
                const items = await service.query(SortedTableName, params, ["Param1", "param2"] as any);
                expect(items.Items).to.have.length(maxItems);
                for (let item of items.Items) {
                    expect(item).to.have.property("Param1");
                    expect(item).to.have.property("param2");
                    expect(item).to.not.have.property(sortedTable.PrimaryKey);
                    expect(item).to.not.have.property(sortedTable.SortKey);
                }
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

            it("Tests that all objects are retrieved with the projection.", async () => {
                const params = {
                    FilterExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": primaryKey
                    }
                };
                const items = await service.scan(SortedTableName, params, "Param1" as any);
                expect(items.Items).to.have.length(maxItems);
                for (let item of items.Items) {
                    expect(item).to.have.property("Param1");
                    expect(item).to.not.have.property("param2");
                    expect(item).to.not.have.property(sortedTable.PrimaryKey);
                    expect(item).to.not.have.property(sortedTable.SortKey);
                }
            });

            it("Tests that all objects are retrieved with the array projection.", async () => {
                const params = {
                    FilterExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": primaryKey
                    }
                };
                const items = await service.scan(SortedTableName, params, ["Param1", "param2"] as any);
                expect(items.Items).to.have.length(maxItems);
                for (let item of items.Items) {
                    expect(item).to.have.property("Param1");
                    expect(item).to.have.property("param2");
                    expect(item).to.not.have.property(sortedTable.PrimaryKey);
                    expect(item).to.not.have.property(sortedTable.SortKey);
                }
            });

            it("Tests that all objects are retrieved in full if array projection is empty.", async () => {
                const params = {
                    FilterExpression: "#N0 = :V0",
                    ExpressionAttributeNames: {
                        "#N0": testTable.PrimaryKey
                    },
                    ExpressionAttributeValues: {
                        ":V0": primaryKey
                    }
                };
                const items = await service.scan(SortedTableName, params, [] as any);
                expect(items.Items).to.have.length(maxItems);
                for (let item of items.Items) {
                    expect(item).to.have.property("Param1");
                    expect(item).to.have.property("param2");
                    expect(item).to.have.property(sortedTable.PrimaryKey);
                    expect(item).to.have.property(sortedTable.SortKey);
                }
            });
        });
    });

    describe("Delete", () => {
        const primaryKey: string = getPrimary();
        let Key: any;

        beforeEach(async () => {
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

        after(async () => {
            await client.delete({ TableName, Key });
        });

        it("Tests that the item was deleted.", async () => {
            await service.delete(TableName, Key);
            const obj = await client.get({ TableName, Key }).promise();
            expect(obj.Item).to.be.undefined;
        });
    });

    describe("Mass delete", () => {
        let primaryKeys: string[];
        let Keys: any[];

        before(() => {
            primaryKeys = [];
            for (let i = 0; i < 100; i++) {
                primaryKeys.push(getPrimary());
            }
        });

        beforeEach(async () => {
            Keys = [];
            for (let primaryKey of primaryKeys) {
                const Key = {
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
                Keys.push(Key);
            }
        });

        it("Tests that all the items are deleted.", async () => {
            await service.delete(TableName, Keys);
            for (let Key of Keys) {
                const obj = await client.get({ TableName, Key }).promise();
                expect(obj.Item).to.be.undefined;
            }
        });
    });
});