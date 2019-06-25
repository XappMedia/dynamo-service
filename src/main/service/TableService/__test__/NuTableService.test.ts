import { DynamoDB } from "aws-sdk";
import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import { DynamoService } from "../../DynamoService";
import { TableSchema } from "../../KeySchema";
import * as Service from "../NuTableService";

Chai.use(SinonChai);
const expect = Chai.expect;

const tableName = "TestTable";

function buildTableSchema(partialSchema: TableSchema<any> = {}): TableSchema<any> {
    return {
        "primaryKey": {
            type: "S",
            primary: true
        },
        ...partialSchema,
    };
}

describe(Service.NuTableService.name, () => {
    let sandbox: Sinon.SinonSandbox;
    let dynamoService: DynamoService;

    before(() => {
        dynamoService = new DynamoService(new DynamoDB());
        sandbox = Sinon.sandbox.create();
        sandbox.stub(dynamoService, "put");
        sandbox.stub(dynamoService, "update");
        sandbox.stub(dynamoService, "get");
        sandbox.stub(dynamoService, "query");
        sandbox.stub(dynamoService, "scan");
        sandbox.stub(dynamoService, "delete");
    });

    beforeEach(() => {
        // Resetting the behavior of all the stubs allows us to change them
        // for each test's needs, but annoyingly means we have to constantly reset them.
        sandbox.resetBehavior();
        sandbox.resetHistory();

        (dynamoService.put as Sinon.SinonStub).returns(Promise.resolve());
        (dynamoService.update as Sinon.SinonStub).returns(Promise.resolve());
        (dynamoService.get as Sinon.SinonStub).returns(Promise.resolve());
        (dynamoService.query as Sinon.SinonStub).returns(Promise.resolve({ Items: [] }));
        (dynamoService.scan as Sinon.SinonStub).returns(Promise.resolve({ Items: [] }));
        (dynamoService.delete as Sinon.SinonStub).returns(Promise.resolve());
    });

    describe(Service.NuTableService.prototype.put.name, () => {
        it("Tests that the item is put.", async () => {
            const schema = buildTableSchema();
            const service = new Service.NuTableService(tableName, dynamoService, schema);
            await service.put({ "primaryKey": "TestKey" });
            expect(dynamoService.put).to.have.been.calledWithMatch(tableName,
                { "primaryKey": "TestKey" },
                {
                    ConditionExpression: "attribute_not_exists(#___cond_NC0)",
                    ExpressionAttributeNames: { "#___cond_NC0": "primaryKey" }
                });
        });

        it("Tests that a schema is converted.", async () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", slugify: true }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);
            await service.put({ "primaryKey": "TestKey", "stringParam": "This Should Be Slugged" });
            expect(dynamoService.put).to.have.been.calledWithMatch(tableName, { "primaryKey": "TestKey", "stringParam": "This-Should-Be-Slugged" });
        });

        it("Tests that the condition expression is passed.", async () => {
            const schema = buildTableSchema({ "stringParam": { type: "S" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);
            await service.put({ "primaryKey": "TestKey", "stringParam": "Value" }, {
                ConditionExpression: "#testParam=:testValue",
                ExpressionAttributeNames: { "#testParam": "stringParam" },
                ExpressionAttributeValues: { ":testValue": "Value" }
            });
            expect(dynamoService.put).to.have.been.calledWithMatch(tableName,
                { "primaryKey": "TestKey" },
                {
                    ConditionExpression: "attribute_not_exists(#___cond_NC0) AND (#___cond_NC1=:___cond_VC0)",
                    ExpressionAttributeNames: { "#___cond_NC0": "primaryKey", "#___cond_NC1": "stringParam" },
                    ExpressionAttributeValues: { ":___cond_VC0": "Value" }
                });
        });

        it("Tests that the sort key is added to the condition.", async () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", sort: true }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);
            await service.put({ "primaryKey": "TestKey", "stringParam": "Value" });
            expect(dynamoService.put).to.have.been.calledWithMatch(tableName,
                { "primaryKey": "TestKey" },
                {
                    ConditionExpression: "attribute_not_exists(#___cond_NC0) AND attribute_not_exists(#___cond_NC1)",
                    ExpressionAttributeNames: { "#___cond_NC0": "primaryKey", "#___cond_NC1": "stringParam" }
                });
        });

        it("Throws an error if the put object is bad.", async () => {
            const schema = buildTableSchema({ "stringParam": { type: "S", sort: true }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);
            await checkError(() => service.put({ } as any), [
                'Key "primaryKey" is required but is not defined.',
                'Key "stringParam" is required but is not defined.']);
        });
    });

    describe(Service.NuTableService.prototype.putAll.name, () => {
        it("Tests that all the items were put.", async () => {
            const schema = buildTableSchema();
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            (dynamoService.put as Sinon.SinonStub).returns(Promise.resolve([]));

            await service.putAll([{ "primaryKey": "TestKey" }, { "primaryKey": "TestKey2" }]);
            expect(dynamoService.put).to.have.been.calledWithMatch(tableName, [{ "primaryKey": "TestKey" }, { "primaryKey": "TestKey2" }]);
        });

        it("Tests that all items returned from the unprocessed column are converted back.", async () => {
            const expectedDate = new Date();
            const schema = buildTableSchema({ createdAt: { type: "Date" } });
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            (dynamoService.put as Sinon.SinonStub).returns(Promise.resolve([{
                primaryKey: "TestKey",
                createdAt: expectedDate.toISOString()
            }]));

            const result = await service.putAll([{ "primaryKey": "TestKey", createdAt: expectedDate }]);
            expect(result).to.deep.equal({
                unprocessed: [{
                    primaryKey: "TestKey",
                    createdAt: expectedDate
                }]
            });
        });

        it("Tests that an error is thrown if one of the objects doesn't match the validation.", async () => {
            const schema = buildTableSchema({ sortKey: { type: "S", sort: true }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);
            await checkError(() => service.putAll([{ "primaryKey": "TestKey", "sortKey": "TestSort" }, { }]),
                ['Key "primaryKey" is required but is not defined.',
                 'Key "sortKey" is required but is not defined.']);
        });
    });

    describe(Service.NuTableService.prototype.update.name, () => {
        it("Tests that the update object was passed to the service.", async () => {
            const schema = buildTableSchema();
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.update({ primaryKey: "Test" }, { set: { "NewParam": "Value" }});

            expect(dynamoService.update).to.have.been.calledWithMatch(tableName, {
                primaryKey: "Test"
            }, {
                set: {
                    "NewParam": "Value"
                }
            });
        });

        it("Tests that the object is converted before inserting.", async () => {
            const schema = buildTableSchema({ stringParam: { type: "S", slugify: true }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.update({ primaryKey: "Test" }, { set: { stringParam: "Param to slug" }});

            expect(dynamoService.update).to.have.been.calledWithMatch(tableName, {
                primaryKey: "Test"
            }, {
                set: {
                    stringParam: "Param-to-slug"
                }
            });
        });

        it("Tests that the object returned is converted from the Dynamo style.", async () => {
            const expectedDate = new Date();
            const schema = buildTableSchema({ dateParam: { type: "Date" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            (dynamoService.update as Sinon.SinonStub).returns(Promise.resolve({
                primaryKey: "Test",
                dateParam: expectedDate.toISOString()
            }));

            const obj = await service.update({ primaryKey: "Test" }, { set: { Whatever: "doesn'tMatter" }}, "ALL_NEW");
            expect(obj).to.deep.equal({
                primaryKey: "Test",
                dateParam: expectedDate
            });
        });

        it("Tests that an error is thrown if the update object doesn't pass validation.", async () => {
            const schema = buildTableSchema({ stringParam: { type: "S", invalidCharacters: ":" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await checkError(() => service.update({ primaryKey: "Test" }, { set: { stringParam: "Param:Toupdate" }}),
                ['Key "stringParam" contains invalid characters ":".']);

        });
    });

    describe(Service.NuTableService.prototype.get.name, () => {
        it("Tests that the item is got.", async () => {
            const schema = buildTableSchema();
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            (dynamoService.get as Sinon.SinonStub).returns(Promise.resolve({ primaryKey: "Test" }));

            const obj = await service.get({ primaryKey: "Test" });

            expect(obj).to.deep.equal({ primaryKey: "Test" });
        });

        it("Tests that the callback is called with the key.", async () => {
            const schema = buildTableSchema();
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            const keys = { primaryKey: "Test1" };

            await service.get(keys);

            expect(dynamoService.get).to.have.been.calledWithMatch(tableName, keys);
        });

        it("Tests that the excess objects are cleared from the key.", async () => {
            const schema = buildTableSchema({ sortKey: { type: "S", sort: true }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.get({ primaryKey: "Test", sortKey: "TestSort", extraParam: "Whatever" });

            expect(dynamoService.get).to.have.been.calledWithMatch(tableName, {
                primaryKey: "Test",
                sortKey: "TestSort"
            });
        });

        it("Tests that the callback is called with the array of keys.", async () => {
            const schema = buildTableSchema();
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            const keys = [{ primaryKey: "Test1" }, { primaryKey: "Test2" }];

            await service.get(keys);

            expect(dynamoService.get).to.have.been.calledWithMatch(tableName, keys);
        });

        it("Tests that the known items are projected on teh columns by default.", async () => {
            const schema = buildTableSchema({ param1: { type: "S" }, param2: { type: "S" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.get({ primaryKey: "test" });

            expect(dynamoService.get).to.have.been.calledWithMatch(tableName, { primaryKey: "test" }, ["primaryKey", "param1", "param2"]);
        });

        it("Tests that the projection is passed to the service.", async () => {
            const schema = buildTableSchema({ param1: { type: "S" }, param2: { type: "S" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.get({ primaryKey: "test" }, "param1");

            expect(dynamoService.get).to.have.been.calledWithMatch(tableName, { primaryKey: "test" }, "param1");
        });
    });

    describe(Service.NuTableService.prototype.query.name, () => {
        it("Tests that the items are queried with default projection.", async () => {
            const schema = buildTableSchema({ param1: { type: "S" }, param2: { type: "S" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.query({
                KeyConditionExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            });

            expect(dynamoService.query).to.have.been.calledWithMatch(tableName, {
                KeyConditionExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            }, ["primaryKey", "param1", "param2"]);
        });

        it("Tests that the updated projection is used.", async () => {
            const schema = buildTableSchema({ param1: { type: "S" }, param2: { type: "S" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.query({
                KeyConditionExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            }, "param1");

            expect(dynamoService.query).to.have.been.calledWithMatch(tableName, {
                KeyConditionExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            }, "param1");
        });

        it("Tests that the object is converted from the dynamodb roots.", async () => {
            const schema = buildTableSchema({ dateParam: { type: "Date" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            const expectedDate = new Date();
            (dynamoService.query as Sinon.SinonStub).returns(Promise.resolve({
                Items: [{
                    primaryKey: "Test",
                    dateParam: expectedDate.toISOString()
                }]
            }));

            const items = await service.query({
                KeyConditionExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            }, "param1");

            expect(items).to.deep.equal({
                Items: [{
                    primaryKey: "Test",
                    dateParam: expectedDate
                }]
            });
        });
    });

    describe(Service.NuTableService.prototype.scan.name, () => {
        it("Tests that the items are queried with default projection.", async () => {
            const schema = buildTableSchema({ param1: { type: "S" }, param2: { type: "S" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.scan({
                FilterExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            });

            expect(dynamoService.scan).to.have.been.calledWithMatch(tableName, {
                FilterExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            }, ["primaryKey", "param1", "param2"]);
        });

        it("Tests that the updated projection is used.", async () => {
            const schema = buildTableSchema({ param1: { type: "S" }, param2: { type: "S" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.scan({
                FilterExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            }, "param1");

            expect(dynamoService.scan).to.have.been.calledWithMatch(tableName, {
                FilterExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            }, "param1");
        });

        it("Tests that the object is converted from the dynamodb roots.", async () => {
            const schema = buildTableSchema({ dateParam: { type: "Date" }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            const expectedDate = new Date();
            (dynamoService.scan as Sinon.SinonStub).returns(Promise.resolve({
                Items: [{
                    primaryKey: "Test",
                    dateParam: expectedDate.toISOString()
                }]
            }));

            const items = await service.scan({
                FilterExpression: "#key=:Value",
                ExpressionAttributeNames: { "#key": "primaryKey" },
                ExpressionAttributeValues: { ":Value": "Test" }
            }, "param1");

            expect(items).to.deep.equal({
                Items: [{
                    primaryKey: "Test",
                    dateParam: expectedDate
                }]
            });
        });
    });

    describe(Service.NuTableService.prototype.delete.name, () => {
        it("Tests that the delete function gets the appropriate key.", async () => {
            const schema = buildTableSchema({ sortParam: { type: "S", sort: true }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            await service.delete({ primaryKey: "Test", sortParam: "Sort", extra: "Param" });

            expect(dynamoService.delete).to.have.been.calledWithMatch(tableName, {
                primaryKey: "Test",
                sortParam: "Sort"
            });
        });

        it("Tests that the delete function gets the appropriate keys of an array.", async () => {
            const schema = buildTableSchema({ sortParam: { type: "S", sort: true }});
            const service = new Service.NuTableService(tableName, dynamoService, schema);

            const keys = [{ primaryKey: "Test", sortParam: "Sort", extra: "Param" },
                          { primaryKey: "Test2", sortParam: "Sort2", extra: "Param" }];

            await service.delete(keys);

            expect(dynamoService.delete).to.have.been.calledWithMatch(tableName, [{
                primaryKey: "Test",
                sortParam: "Sort"
            }, {
                primaryKey: "Test2",
                sortParam: "Sort2"
            }]);
        });
    });
});

async function checkError(callback: () => Promise<any>, expectedErrors?: string[]) {
    let caughtError: Error;
    try {
        await callback();
    } catch (e) {
        caughtError = e;
    }

    expect(caughtError, "An error was not thrown when it was expected to.").to.exist;
    expect(caughtError).to.be.instanceOf(Error);
    if (expectedErrors) {
        for (const error of expectedErrors) {
            expect(caughtError.message).to.include(error);
        }
    }
}