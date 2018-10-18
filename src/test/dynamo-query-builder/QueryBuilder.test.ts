import * as Chai from "chai";
import { QueryBuilder } from "../../main/dynamo-query-builder/QueryBuilder";
import { TableSchema } from "../../main/service/KeySchema";

const expect = Chai.expect;

const TestSchema: TableSchema = {
    primaryKey: {
        type: "S",
        primary: true
    }
};

describe.only("QueryBuilder", () => {
    it("Tests that the KeyConditionExpression is properly created.", () => {
        const builder = new QueryBuilder(TestSchema);
        const query = builder.primaryKey("primaryKey").equals("2").build();
        expect(query.KeyConditionExpression).to.deep.equal("#____n_0=:____v_0");
        expect(query.ExpressionAttributeNames["#____n_0"]).to.equal("test");
        expect(query.ExpressionAttributeValues[":____v_0"]).to.equal("2");
    });
});