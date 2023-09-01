/**
 * Copyright 2019 XAPPmedia
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import {
    BatchWriteCommand,
    BatchWriteCommandInput,
    BatchWriteCommandOutput,
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    GetCommandInput,
    PutCommand,
    PutCommandInput, } from "@aws-sdk/lib-dynamodb";
import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import * as TableUtils from "../../__test__/TableUtils";
import * as DS from "../DynamoService";

const uuid = require("uuid4");

Chai.use(SinonChai);
const expect = Chai.expect;

const db: DynamoDB = new DynamoDB({
    endpoint: "http://localhost:8000",
    region: "us-east-1",
    credentials: {
        accessKeyId: "somelocalkeyid",
        secretAccessKey: "somelocalaccesskey",
    },
});

const client: DynamoDBDocumentClient = DynamoDBDocumentClient.from(db);
const stubbedClient: DynamoDBDocumentClient = DynamoDBDocumentClient.from(db);

const TableName: string = "DynamoServiceTestTable";
const SortedTableName: string = "DynamoServiceSortedTestTable";

const sortKey: string = "CreatedAt";

function justReturnsObject(obj: any) {
    return obj;
}

describe("DynamoService", function () {

    this.timeout(10000);

    const service: DS.DynamoService = new DS.DynamoService(stubbedClient);

    let testTable: TableUtils.Table;
    let sortedTable: TableUtils.Table;

    let putTransformer: Sinon.SinonStub;

    let updateTransformer: Sinon.SinonStub;

    let sendStub: Sinon.SinonSpy;

    before(async () => {
        sendStub = Sinon.spy(stubbedClient, "send");

        putTransformer = Sinon.stub();
        updateTransformer = Sinon.stub();

        service.addPutInterceptor(putTransformer);
        service.addUpdateInterceptor(updateTransformer);

        testTable = await TableUtils.createTable(db, TableUtils.defaultTableInput(TableName));
        sortedTable = await TableUtils.createTable(db, TableUtils.defaultTableInput(SortedTableName, { sortKey }));
    });

    beforeEach(() => {
        sendStub.resetHistory();

        putTransformer.resetBehavior();
        putTransformer.resetHistory();
        putTransformer.callsFake(justReturnsObject);

        updateTransformer.resetBehavior();
        updateTransformer.resetHistory();
        updateTransformer.callsFake(justReturnsObject);
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
        const params: GetCommandInput = {
            TableName,
            Key: key
        };
        console.log("Getting item", params);
        return client.send(new GetCommand(params));
    }

    describe("AddPutInterceptor", () => {
        it("Tests that an error is thrown if the put interceptor is undefined.", () => {
            let caughtError: Error;
            try {
                service.addPutInterceptor(undefined);
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.exist;
        });
    });

    describe("AddUpdateInterceptor", () => {
        it("Tests that an error is thrown if the update interceptor is undefined.", () => {
            let caughtError: Error;
            try {
                service.addUpdateInterceptor(undefined);
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.exist;
        });
    });

    describe("Put", () => {
        it("Tests that the put method gives the db the appropriate items.", async () => {
            const Item = { [testTable.PrimaryKey]: getPrimary(), Param1: "One", param2: 2 };
            await service.put(testTable.TableName, Item);
            expect((sendStub.args[0][0])).to.be.instanceOf(PutCommand);
            expect((sendStub.args[0][0] as PutCommand).input).to.deep.equal({ TableName, Item });
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

        it("Tests that the interceptor is called with the object.", async () => {
            const Item = { [testTable.PrimaryKey]: getPrimary(), Param1: "One", param2: 2 };
            await service.put(testTable.TableName, Item);

            expect(putTransformer).to.have.been.calledWith(Item);
        });

        it("Tests that the put inserted is the one that is transformed.", async () => {
            const Item = { [testTable.PrimaryKey]: getPrimary(), Param1: "One", param2: 2 };
            putTransformer.callsFake((obj: any) => {
                obj["TestAttribute"] = "This is a transformed object.";
                return obj;
            });
            await service.put(testTable.TableName, Item);

            const queriedItem = await get({ [testTable.PrimaryKey]: Item[testTable.PrimaryKey] });
            expect(queriedItem.Item).to.deep.equal({
                ...Item,
                "TestAttribute": "This is a transformed object."
            });
        });

        it("Tests that an error is thrown if the interceptor doesn't return anything.", async () => {
            const Item = { [testTable.PrimaryKey]: getPrimary(), Param1: "One", param2: 2 };
            putTransformer.callsFake((obj: any) => {
                obj["TestAttribute"] = "This is a transformed object.";
            });
            let caughtError: Error;
            try {
                await service.put(testTable.TableName, Item);
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
            const unprocessed = await service.put(testTable.TableName, items);

            expect(unprocessed).to.have.length(0);

            let count = 0;
            for (let key of Keys) {
                const found = await get(key);
                expect(found).to.exist;
                expect(found.Item).to.deep.equal({ ...key, Param1: "One", param2: 2 });
                ++count;
            }
            expect(count).to.equal(Keys.length);
        });

        it("Tests that all items are passed through the interceptor.", async () => {
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

            for (const item of items) {
                expect(putTransformer).to.have.been.calledWith(item);
            }
        });

        it("Tests that all items have been transformed.", async () => {
            putTransformer.callsFake((o) => {
                o["TestArg"] = "This is an argument transformed on to the object.";
                return o;
            });
            const items: any[] = [];
            const Keys: any[] = [];
            for (let i = 0; i < 50; i++) {
                const newKey = { [testTable.PrimaryKey]: getPrimary(), };
                Keys.push(newKey);
                items.push({
                    ...newKey, Param1: "One", param2: 2
                });
            }
            const unprocessed = await service.put(testTable.TableName, items);

            expect(unprocessed).to.have.length(0);

            let count = 0;
            for (let key of Keys) {
                const found = await get(key);
                expect(found).to.exist;
                expect(found.Item).to.deep.equal({ ...key, Param1: "One", param2: 2, "TestArg": "This is an argument transformed on to the object." });
                ++count;
            }
            expect(count).to.equal(Keys.length);
        });

        describe("Error condition.", function() {
            this.timeout(90000);

            let batchWriteSendStub: Sinon.SinonStub;

            before(() => {
                sendStub.restore();

                batchWriteSendStub = Sinon.stub(stubbedClient, "send");
            })

            beforeEach(() => {
                batchWriteSendStub.resetHistory();
                batchWriteSendStub.resetBehavior();
                batchWriteSendStub.callsFake((items: BatchWriteCommand) => {
                    const response: Pick<BatchWriteCommandOutput, "UnprocessedItems"> = {
                        UnprocessedItems: items.input.RequestItems
                    };
                    console.log("Calling fake", JSON.stringify(response, undefined, 2));
                    return Promise.resolve(response);
                });
            });

            after(() => {
                batchWriteSendStub.restore();

                sendStub = Sinon.spy(stubbedClient, "send");
            });

            it("Tests that the unprocessed are returned in order.", async () => {
                const items = [];
                const Keys: any[] = [];
                for (let i = 0; i < 50; i++) {
                    const newKey = { [testTable.PrimaryKey]: getPrimary(), };
                    Keys.push(newKey);
                    items.push({
                        ...newKey, Param1: "One", param2: 2
                    });
                }

                console.log("Putting item");
                const unprocessed: any = await service.put(testTable.TableName, items, { attempts: 3 });
                console.log("U", unprocessed);
                expect(unprocessed).to.have.length(items.length);

                for (let i = 0; i < items.length; ++i) {
                    expect(items[i]).to.deep.equal(unprocessed[i]);
                }
            });
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
            Item = { ...Key, Param1: "One", parm2: 2, Nested: { param1: "FirstParam", param2: "SecondParam", param3: "ThirdParam" } };
            Item2 = { ...Key2, Param1: "One2", parm2: 22, ArrayItem: ["One", "Two", "Three"], Nested: { ArrayItem: ["One", "Two", "Three"]}};
            await client.send(new PutCommand({ TableName, Item }));
            await client.send(new PutCommand({ TableName, Item: Item2 }));
        });

        after(async () => {
            await client.send(new DeleteCommand({ TableName, Key }));
            await client.send(new DeleteCommand({ TableName, Key: Key2 }));
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

        it("Tests that a nested projection returns the items.", async () => {
            const item = await service.get(TableName, Key, "Nested.param1" as any);
            expect(item).to.deep.equal({ Nested: { param1: "FirstParam" }});
        });

        it("Tests that a nested projection as an array returns the items.", async () => {
            const item = await service.get(TableName, Key, ["Param1", "Nested.param1", "Nested.param2"] as any);
            expect(item).to.deep.equal({ Param1: "One", Nested: { param1: "FirstParam", param2: "SecondParam" }});
        });

        it("Tests that nested projection as an array works when searching for multiple items.", async () => {
            const items = await service.get(TableName, [Key, Key2], ["Param1", "Nested.param1", "Nested.param2"] as any);
            expect(items).to.deep.include.members([
                { Param1: "One", Nested: { param1: "FirstParam", param2: "SecondParam" }},
                { Param1: "One2" }]);
        });

        it("Tests that an array item is retrieved in projection.", async () => {
            const item = await service.get(TableName, Key2, "ArrayItem[1]" as any);
            expect(item).to.deep.equal({ ArrayItem: ["Two"]});
        });

        it("Tests that an array of nested items are retrieved in projection", async () => {
            const item = await service.get(TableName, Key2, "Nested.ArrayItem[1]" as any);
            expect(item).to.deep.equal({ Nested: { ArrayItem: ["Two"] }});
        });

        it("Tests that array projection works with multiple projections", async () => {
            const item = await service.get(TableName, Key2, ["ArrayItem[1]", "Nested.ArrayItem[1]"] as any);
            expect(item).to.deep.equal({ ArrayItem: ["Two"], Nested: { ArrayItem: ["Two" ]}});
        });
    });

    describe("getAll", () => {
        let Key: any;
        let Key2: any;
        let Item: any;
        let Item2: any;

        before(async () => {
            Key = { [testTable.PrimaryKey]: getPrimary() };
            Key2 = { [testTable.PrimaryKey]: getPrimary() };
            Item = { ...Key, Param1: "One", parm2: 2 };
            Item2 = { ...Key2, Param1: "One2", parm2: 22 };
            await client.send(new PutCommand({ TableName, Item }));
            await client.send(new PutCommand({ TableName, Item: Item2 }));
        });

        after(async () => {
            await client.send(new DeleteCommand({ TableName, Key }));
            await client.send(new DeleteCommand({ TableName, Key: Key2 }));
        });

        it("Tests that both items are returned.", async () => {
            const item = await service.getAll(TableName, [Key, Key2]);
            expect(item).to.deep.include.members([Item, Item2]);
        });

        it("Tests that a projection array retrieves the return items when searching for multiple.", async () => {
            const item = await service.getAll(TableName, [Key, Key2], ["Param1", "parm2"] as any);
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
                        ObjParam2: { Param1: "Value1", Param2: "Value2" },
                        ListParam1: [1, 2, 3, 4, 5, 6],
                        ListParam2: [1, 2, 3, 4, 5, 6],
                        NestedLIstParam1: {
                            list: [{
                                param1: "Value",
                                param2: "Value"
                            }, {
                                param3: "Value",
                                param4: "Value"
                            }]
                        }
            };
            await client.send(new PutCommand({
                TableName: testTable.TableName,
                Item
            }));
        });

        it("Tests that the item is updated with an existing parameter.", async () => {
            await service.update(testTable.TableName, Key, { set: { StringParam1: "Zero" } });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
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
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.StringParam1).to.not.exist;
        });

        it("Tests that setting an attribute to blank will remove it.", async () => {
            await service.update(testTable.TableName, Key, { set: { StringParam1: "" } });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.StringParam1).to.not.exist;
        });

        it("Tests that the item is updated with an new parameter.", async () => {
            await service.update(testTable.TableName, Key, { set: { Param4: "Four" } });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.Param4).to.equal("Four");
        });

        it("Tests that the item has a key removed.", async () => {
            await service.update<any>(testTable.TableName, Key, { remove: ["ObjParam1"] });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.ObjParam1).to.be.undefined;
        });

        it("Tests that the item is appended.", async () => {
            await service.update(testTable.TableName, Key, { append: { ListParam1: [7] } });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.ListParam1).to.have.ordered.members([1, 2, 3, 4, 5, 6, 7]);
        });

        it("Tests that the item is prepended.", async () => {
            await service.update(testTable.TableName, Key, { prepend: { ListParam1: [7] } });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.ListParam1).to.have.ordered.members([7, 1, 2, 3, 4, 5, 6]);
        });

        it("Tests that the list is created if it does not exist when appending.", async () => {
            await service.update(testTable.TableName, Key, { append: { NonExistentListParam1: [7] } });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.NonExistentListParam1).to.have.ordered.members([7]);
        });

        it("Tests that the list is created if it does not exist when prepending.", async () => {
            await service.update(testTable.TableName, Key, { prepend: { NonExistentListParam1: [7] } });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.NonExistentListParam1).to.have.ordered.members([7]);
        });

        it("Tests that a nested attribute is updated.", async () => {
            await service.update(testTable.TableName, Key, {
                set: {
                    "ObjParam2.Param1": "NewValue"
                }
            });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.ObjParam2).to.deep.equal({ Param1: "NewValue", Param2: "Value2" });
        });

        it("Tests that an empty string is allowed to be set in an object.", async () => {
            await service.update(testTable.TableName, Key, { set: { ObjParam1: { Param: "", Param2: "Test" }}});
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.ObjParam1).to.deep.equal({ Param2: "Test" });
        });

        it("Tests that an array is set.", async () => {
            const arr = ["One", "Two", "Three", "", "  ", { Param1: "", Param2: "One", Param3: { Param1: "", Param2: "Two" }, param4: {}}, ["One", "Two", ""]];
            const expected = ["One", "Two", "Three", "  ", { Param2: "One", Param3: { Param2: "Two" }, param4: {}}, ["One", "Two"]];
            await service.update(testTable.TableName, Key, { set: { arrParam1: arr }});
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.arrParam1).to.deep.equal(expected);
        });

        it("Tests that an attribute in the nested list parameter is updated.", async () => {
            await service.update(testTable.TableName, Key, { set: {
                "NestedLIstParam1.list[0].param3": "NewValue"
            }});
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.NestedLIstParam1).to.deep.equal({
                list: [{
                    param1: "Value",
                    param2: "Value",
                    param3: "NewValue"
                }, {
                    param3: "Value",
                    param4: "Value"
                }]
            });
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
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
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
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
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
                },
                prepend: {
                    ListParam2: [10],
                    NonExistentListParam3: [2]
                }
            });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));
            expect(updatedObj.Item.StringParam1).to.equal("MassiveChangeNewValue");
            expect(updatedObj.Item.Param5).to.equal("Zero");
            expect(updatedObj.Item.NumberParam1).to.be.undefined;
            expect(updatedObj.Item.ListParam1).to.deep.equal([1, 2, 3, 4, 5, 6, 9]);
            expect(updatedObj.Item.ListParam2).to.deep.equal([10, 1, 2, 3, 4, 5, 6]);
            expect(updatedObj.Item.NonExistentListParam2).to.deep.equal([1]);
            expect(updatedObj.Item.NonExistentListParam3).to.deep.equal([2]);
        });

        it("Tests that the update transformer is called.", async () => {
            await service.update<any>(testTable.TableName, Key, {
                set: {
                    StringParam1: "NewValue"
                }
            });
            expect(updateTransformer).to.have.been.calledWithMatch({
                set: {
                    StringParam1: "NewValue"
                }
            });
        });

        it("Tests that the update transformer accepts the transformation", async () => {
            updateTransformer.callsFake((obj) => {
                obj.set["NewTransformedAttr"] = "New Transformed Value";
                return obj;
            });
            await service.update<any>(testTable.TableName, Key, {
                set: {
                    StringParam1: "NewValue"
                }
            });
            const updatedObj = await client.send(new GetCommand({ TableName: testTable.TableName, Key }));

            expect(updatedObj.Item).to.have.property("NewTransformedAttr", "New Transformed Value");
        });
    });

    describe("BatchGet, Query, Scan", () => {
        const maxItems = 10;
        let primaryKey: string;
        let Keys: any[];
        let Items: any[];

        before(async () => {
            const batchWriteItemCommandInput: BatchWriteCommandInput = {
                RequestItems: {
                    [SortedTableName]: []
                }
            };
            primaryKey = getPrimary();
            Keys = [];
            Items = [];
            for (let i = 0; i < maxItems; ++i) {
                Keys.push({ [sortedTable.PrimaryKey]: primaryKey, [sortedTable.SortKey]: getSort(i) });
                Items.push({ ...Keys[i], Param1: "One", param2: 2 });
                batchWriteItemCommandInput.RequestItems[SortedTableName].push({
                    PutRequest: {
                        Item: Items[i]
                    }
                });
            }
            await client.send(new BatchWriteCommand(batchWriteItemCommandInput));
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
            await client.send(new PutCommand({
                TableName: testTable.TableName,
                Item: {
                    ...Key,
                    StringParam1: "One",
                    NumberParam1: 2,
                    ObjParam1: { Param: "Value" },
                    ListParam1: [1, 2, 3, 4, 5, 6]
                }
            }));
        });

        after(async () => {
            await client.send(new DeleteCommand({ TableName, Key }));
        });

        it("Tests that the item was deleted.", async () => {
            await service.delete(TableName, Key);
            const obj = await client.send(new GetCommand({ TableName, Key }));
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
                const input: PutCommandInput = {
                    TableName: testTable.TableName,
                    Item: {
                        ...Key,
                        StringParam1: "One",
                        NumberParam1: 2,
                        ObjParam1: { Param: "Value" },
                        ListParam1: [1, 2, 3, 4, 5, 6]
                    }
                };
                await client.send(new PutCommand(input));
                Keys.push(Key);
            }
        });

        it("Tests that all the items are deleted.", async () => {
            await service.delete(TableName, Keys);
            for (let Key of Keys) {
                const obj = await client.send(new GetCommand({ TableName, Key }));
                expect(obj.Item).to.be.undefined;
            }
        });
    });
});