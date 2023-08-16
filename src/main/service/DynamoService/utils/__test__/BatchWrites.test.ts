import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import { DynamoDBActionPerformer } from "../../DynamoDBActionPerformer";
import { DynamoDBWriteRequest } from "../../IDynamoService";
import { batchWrites, batchWriteUntilCompleteOrRunout } from "../BatchWrites";

Chai.use(SinonChai);
const expect = Chai.expect;

describe("BatchWrite", () => {
    const performer: Pick<DynamoDBActionPerformer, "batchWriteItems"> = {
        batchWriteItems: Sinon.stub().returns(Promise.resolve({
            UnprocessedItems: {
            }
        }))
    };

    beforeEach(() => {
        (performer.batchWriteItems as Sinon.SinonStub).reset();
        (performer.batchWriteItems as Sinon.SinonStub).returns(Promise.resolve({
            UnprocessedItems: {
            }
        }));
    });

    describe(batchWrites.name, () => {
        it("Will properly send requests to the batch write items.", async () => {
            const response = await batchWrites({
                tableName: "TestTable",
                performer,
                attempts: 5,
                writeRequests: [{
                    PutRequest: {
                        Item: { param1: "Value" }
                    }
                }]
            });
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    TestTable: [{
                        PutRequest: {
                            Item: { param1: "Value" }
                        }
                    }]
                }
            });
            expect(response).to.deep.equal([]);
        });

        it("Will properly send requests to the batch write items 25 at a time.", async () => {
            const requests: DynamoDBWriteRequest[] = [];
            for (let i = 0; i < 60; ++i) {
                requests.push({
                    PutRequest: {
                        Item: { param1: "Value2" }
                    }
                });
            }
            const response = await batchWrites({
                tableName: "TestTable",
                performer,
                attempts: 5,
                writeRequests: requests
            });
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    TestTable: requests.slice(0, 25)
                }
            });
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    TestTable: requests.slice(25, 50)
                }
            });
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    TestTable: requests.slice(50)
                }
            });
            expect(response).to.deep.equal([]);
        });
    });

    describe(batchWriteUntilCompleteOrRunout.name, () => {

        it("Will properly perform a single batch write.", async () => {
            const response = await batchWriteUntilCompleteOrRunout({
                input: {
                    RequestItems: {
                        TestTable: [{
                            PutRequest: {
                                Item: { param1: "Value" }
                            }
                        }]
                    }
                },
                attempts: 5,
                performer
            });
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    TestTable: [{
                        PutRequest: {
                            Item: { param1: "Value" }
                        }
                    }]
                }
            });
            expect(response).to.deep.equal({});
        });

        it("Will properly re-attempt on an unprocessed", async () => {
            (performer.batchWriteItems as Sinon.SinonStub).onFirstCall().returns(Promise.resolve({
                UnprocessedItems: {
                    "newTable": [{
                        PutRequest: { param2: "Value"}
                    }]
                }
            }));
            (performer.batchWriteItems as Sinon.SinonStub).onSecondCall().returns(Promise.resolve({
                UnprocessedItems: {
                    "newerTable": [{
                        PutRequest: { param3: "Value"}
                    }]
                }
            }));
            (performer.batchWriteItems as Sinon.SinonStub).onThirdCall().returns(Promise.resolve({
                UnprocessedItems: {
                }
            }));
            const response = await batchWriteUntilCompleteOrRunout({
                input: {
                    RequestItems: {
                        TestTable: [{
                            PutRequest: {
                                Item: { param1: "Value" }
                            }
                        }]
                    }
                },
                attempts: 5,
                performer
            });
            expect(performer.batchWriteItems).to.have.callCount(3);
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    TestTable: [{
                        PutRequest: {
                            Item: { param1: "Value" }
                        }
                    }]
                }
            });
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    "newTable": [{
                        PutRequest: { param2: "Value"}
                    }]
                }
            });
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    "newerTable": [{
                        PutRequest: { param3: "Value"}
                    }]
                }
            });
            expect(response).to.deep.equal({});
        });

        it("Will properly return the unporocessed requests after all failed attempts", async () => {
            (performer.batchWriteItems as Sinon.SinonStub).returns(Promise.resolve({
                UnprocessedItems: {
                    "newTable": [{
                        PutRequest: { param2: "Value"}
                    }]
                }
            }));
            const response = await batchWriteUntilCompleteOrRunout({
                input: {
                    RequestItems: {
                        TestTable: [{
                            PutRequest: {
                                Item: { param1: "Value" }
                            }
                        }]
                    }
                },
                attempts: 5,
                performer
            });
            expect(performer.batchWriteItems).to.have.callCount(5);
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    TestTable: [{
                        PutRequest: {
                            Item: { param1: "Value" }
                        }
                    }]
                }
            });
            expect(performer.batchWriteItems).to.have.been.calledWithMatch({
                RequestItems: {
                    "newTable": [{
                        PutRequest: { param2: "Value"}
                    }]
                }
            });
            expect(response).to.deep.equal({
                "newTable": [{
                    PutRequest: { param2: "Value"}
                }]
            });
        });
    });

});
