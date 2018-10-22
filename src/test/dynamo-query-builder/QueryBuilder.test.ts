import * as Chai from "chai";
import { query } from "../../main/dynamo-query-builder/QueryBuilder";
import { TableSchema } from "../../main/service/KeySchema";

const expect = Chai.expect;

interface NonSortTable {
    tablePrimaryKey: string;
}

interface SortTable {
    tablePrimaryKey: string;
    tableSortKey: string;
}

const TestSchema: TableSchema<NonSortTable> = {
    tablePrimaryKey: {
        type: "S",
        primary: true
    }
};

const TestSchema2: TableSchema<SortTable> = {
    tablePrimaryKey: {
        type: "S",
        primary: true
    },
    tableSortKey: {
        type: "S",
        sort: true
    }
};

describe.only("QueryBuilder", () => {
    it("Tests that the KeyConditionExpression is properly created with equals.", () => {
        const builder = query(TestSchema);
        const finishedQuery = builder.primaryKey.equals("2").query;
        expect(finishedQuery.KeyConditionExpression).to.equal("#____n_0 = :____v_0");
        expect(finishedQuery.ExpressionAttributeNames["#____n_0"]).to.equal("tablePrimaryKey");
        expect(finishedQuery.ExpressionAttributeValues[":____v_0"]).to.equal("2");
    });

    it("Tests that the and conjunction works.", () => {
        const builder = query(TestSchema);
        const finishedQuery = builder.primaryKey.equals("2").and.primaryKey.equals("3").query;
        expect(finishedQuery.KeyConditionExpression).to.equal("#____n_0 = :____v_0 and #____n_0 = :____v_1");
        expect(finishedQuery.ExpressionAttributeNames["#____n_0"]).to.equal("tablePrimaryKey");
        expect(finishedQuery.ExpressionAttributeValues[":____v_0"]).to.equal("2");
        expect(finishedQuery.ExpressionAttributeValues[":____v_1"]).to.equal("3");
    });

    it("Tests that the sort key combination works.", () => {
        const builder = query(TestSchema2);
        const finishedQuery = builder.primaryKey.equals("2").and.sortKey.equals(3).query;
        expect(finishedQuery.KeyConditionExpression).to.equal("#____n_0 = :____v_0 and #____n_1 = :____v_1");
        expect(finishedQuery.ExpressionAttributeNames["#____n_0"]).to.equal("tablePrimaryKey");
        expect(finishedQuery.ExpressionAttributeNames["#____n_1"]).to.equal("tableSortKey");
        expect(finishedQuery.ExpressionAttributeValues[":____v_0"]).to.equal("2");
        expect(finishedQuery.ExpressionAttributeValues[":____v_1"]).to.equal(3);
    });
});