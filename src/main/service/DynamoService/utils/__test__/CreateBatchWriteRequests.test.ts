import * as Chai from "chai";
import { createDeleteBatchWriteRequests, createPutBatchWriteRequests } from "../CreateBatchWriteRequests";

const expect = Chai.expect;

describe(createPutBatchWriteRequests.name, () => {

    it("Properly creates the single batch request.", () => {
        const response = createPutBatchWriteRequests({ param1: "Value" });
        expect(response).to.deep.equal([{
            PutRequest: {
                Item: {param1: "Value"}
            }
        }]);
    });

    it("Properly creates the multi batch request.", () => {
        const response = createPutBatchWriteRequests([{ param1: "Value" }, { param2: "Value" }]);
        expect(response).to.deep.equal([{
            PutRequest: {
                Item: {param1: "Value"}
            }
        }, {
            PutRequest: {
                Item: {param2: "Value"}
            }
        }]);
    });
});

describe(createDeleteBatchWriteRequests.name, () => {
    it("Properly creates the single batch request.", () => {
        const response = createDeleteBatchWriteRequests({ param1: "Value" });
        expect(response).to.deep.equal([{
            DeleteRequest: {
                Key: {param1: "Value"}
            }
        }]);
    });

    it("Properly creates the multi batch request.", () => {
        const response = createDeleteBatchWriteRequests([{ param1: "Value" }, { param2: "Value" }]);
        expect(response).to.deep.equal([{
            DeleteRequest: {
                Key: {param1: "Value"}
            }
        }, {
            DeleteRequest: {
                Key: {param2: "Value"}
            }
        }]);
    });
});