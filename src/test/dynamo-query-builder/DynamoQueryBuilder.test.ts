import { expect } from "chai";

import * as Builder from "../../main/dynamo-query-builder/DynamoQueryBuilder";

describe("DynamoQueryBuilder", () => {

    // NOTE: "NC#" and "VC#" are code words that the builder gives to the keys to ensure they're unique.  The number will correspond with the order in which they are placed in.

    it("Tests the equals works with a single item.", () => {
        const query = Builder.scan("value1").equals(5).query();
        expect(query).to.have.property("FilterExpression", "#NC0=:VC0");

        expect(query).to.have.deep.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
    });

    it("Tests that `not equals works` with a single item.", () => {
        const query = Builder.scan("value1").doesNotEquals(5).query();
        expect(query).to.have.property("FilterExpression", "#NC0<>:VC0");

        expect(query).to.have.deep.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
    });

    it("Tests that the `not equals any`works with a single item.", () => {
        const query = Builder.scan("value1").doesNotEqualsAll(5).query();
        expect(query).to.have.property("FilterExpression", "#NC0<>:VC0");

        expect(query).to.have.deep.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
    });

    it("Tests that the `not equals any`works with a single item.", () => {
        const query = Builder.scan("value1").doesNotEqualsAll([5, 6, 7, 8]).query();
        expect(query).to.have.property("FilterExpression", "#NC0<>:VC0 AND #NC0<>:VC1 AND #NC0<>:VC2 AND #NC0<>:VC3");

        expect(query).to.have.deep.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
        expect(query.ExpressionAttributeValues[":VC1"]).to.equal(6);
        expect(query.ExpressionAttributeValues[":VC2"]).to.equal(7);
        expect(query.ExpressionAttributeValues[":VC3"]).to.equal(8);
    });

    it("Tests that the items work in sequential order.", () => {
        const query = Builder.scan("value1").equals(5).and("value2").equals(6).and("value3").equals("A string").query();

        expect(query).to.have.property("FilterExpression", "#NC0=:VC0 AND #NC1=:VC1 AND #NC2=:VC2");

        expect(query).to.have.deep.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");
        expect(query.ExpressionAttributeNames["#NC1"]).to.equal("value2");
        expect(query.ExpressionAttributeNames["#NC2"]).to.equal("value3");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
        expect(query.ExpressionAttributeValues[":VC1"]).to.equal(6);
        expect(query.ExpressionAttributeValues[":VC2"]).to.equal("A string");
    });

    it("Tests the or parameters", () => {
        const query = Builder.scan("value1").equals(5).or("value2").equals(6).query();

        expect(query).to.have.property("FilterExpression", "#NC0=:VC0 OR #NC1=:VC1");

        expect(query).to.have.deep.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");
        expect(query.ExpressionAttributeNames["#NC1"]).to.equal("value2");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
        expect(query.ExpressionAttributeValues[":VC1"]).to.equal(6);
    });

    it("Tests that the names are not overwritten.", () => {
        const query = Builder.scan("value1").equals(5).or("value1").equals(6).or("value1").equals("A string").query();

        expect(query).to.have.property("FilterExpression", "#NC0=:VC0 OR #NC0=:VC1 OR #NC0=:VC2");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
        expect(query.ExpressionAttributeValues[":VC1"]).to.equal(6);
        expect(query.ExpressionAttributeValues[":VC2"]).to.equal("A string");
    });

    it("Tests the equals any", () => {
        const query = Builder.scan("value1").equalsAny([5, 6, 7, 8, 9]).query();

        expect(query).to.have.property("FilterExpression", "#NC0=:VC0 OR #NC0=:VC1 OR #NC0=:VC2 OR #NC0=:VC3 OR #NC0=:VC4");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
        expect(query.ExpressionAttributeValues[":VC1"]).to.equal(6);
        expect(query.ExpressionAttributeValues[":VC2"]).to.equal(7);
        expect(query.ExpressionAttributeValues[":VC3"]).to.equal(8);
        expect(query.ExpressionAttributeValues[":VC4"]).to.equal(9);
    });

    it("Tests the equals any for a single item.", () => {
        const query = Builder.scan("value1").equalsAny(5).query();

        expect(query).to.have.property("FilterExpression", "#NC0=:VC0");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
    });

    it("Tests the equals any with a single attribute.", () => {
        const query = Builder.scan("value1").equalsAny([5]).query();

        expect(query).to.have.property("FilterExpression", "#NC0=:VC0");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
    });

    it("Tests the attribute exists.", () => {
        const query = Builder.scan("value1").exists.query();
        expect(query).to.have.property("FilterExpression", "attribute_exists(#NC0)");
        expect(query).to.have.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");
        expect(query).to.not.have.property("ExpressionAttributeValues");
    });

    it("Tests the linked exists.", () => {
        const query = Builder.scan("value1").exists.and("value1").equals(5).query();
        expect(query).to.have.property("FilterExpression", "attribute_exists(#NC0) AND #NC0=:VC0");

        expect(query).to.have.deep.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
    });

    it("Tests the attribute not exists.", () => {
        const query = Builder.scan("value1").doesNotExist.query();
        expect(query).to.have.property("FilterExpression", "attribute_not_exists(#NC0)");
        expect(query).to.have.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");
        expect(query).to.not.have.property("ExpressionAttributeValues");
    });

    it("Tests the linked of not exists.", () => {
        // This query would actually not yield anything, but we're using it for testing purposes.
        const query = Builder.scan("value1").doesNotExist.and("value1").equals(5).query();
        expect(query).to.have.property("FilterExpression", "attribute_not_exists(#NC0) AND #NC0=:VC0");

        expect(query).to.have.deep.property("ExpressionAttributeNames");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("value1");

        expect(query).to.have.deep.property("ExpressionAttributeValues");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal(5);
    });

    it("Tests that the values of nested attributes gets split.", () => {
        const query = Builder.scan("nested.value1").exists.query();
        expect(query).to.have.property("FilterExpression", "attribute_exists(#NC0.#NC1)");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("nested");
        expect(query.ExpressionAttributeNames["#NC1"]).to.equal("value1");
    });

    it("Tests that the values of nested attributes are split among multiple accounts.", () => {
        const query = Builder.scan("nested").exists.and("nested.value1").exists.query();
        expect(query).to.have.property("FilterExpression", "attribute_exists(#NC0) AND attribute_exists(#NC0.#NC1)");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("nested");
        expect(query.ExpressionAttributeNames["#NC1"]).to.equal("value1");
    });

    it("Tests that the 'and' works with a ScanQuery", () => {
        const firstQuery = Builder.scan("param1").equals(5).and("param2").equals(6).and("param3").exists.query();
        const secondQuery = Builder.scan("param3").equals(7).and(firstQuery).query();

        expect(secondQuery).to.have.property("FilterExpression", "#NC0=:VC0 AND (#NC1=:VC1 AND #NC2=:VC2 AND attribute_exists(#NC0))");
        expect(secondQuery.ExpressionAttributeNames["#NC0"]).to.equal("param3");
        expect(secondQuery.ExpressionAttributeNames["#NC1"]).to.equal("param1");
        expect(secondQuery.ExpressionAttributeNames["#NC2"]).to.equal("param2");

        expect(secondQuery.ExpressionAttributeValues[":VC0"]).to.equal(7);
        expect(secondQuery.ExpressionAttributeValues[":VC1"]).to.equal(5);
        expect(secondQuery.ExpressionAttributeValues[":VC2"]).to.equal(6);
    });

    it("Tests that the 'or' works with a ScanQuery", () => {
        const firstQuery = Builder.scan("param1").equals(5).or("param2").equals(6).or("param3").exists.query();
        const secondQuery = Builder.scan("param3").equals(7).or(firstQuery).query();

        expect(secondQuery).to.have.property("FilterExpression", "#NC0=:VC0 OR (#NC1=:VC1 OR #NC2=:VC2 OR attribute_exists(#NC0))");
        expect(secondQuery.ExpressionAttributeNames["#NC0"]).to.equal("param3");
        expect(secondQuery.ExpressionAttributeNames["#NC1"]).to.equal("param1");
        expect(secondQuery.ExpressionAttributeNames["#NC2"]).to.equal("param2");

        expect(secondQuery.ExpressionAttributeValues[":VC0"]).to.equal(7);
        expect(secondQuery.ExpressionAttributeValues[":VC1"]).to.equal(5);
        expect(secondQuery.ExpressionAttributeValues[":VC2"]).to.equal(6);
    });

    it("Tests that passing in an undefined in the scan query will return the same conjunction", () => {
        const query = Builder.scan("param1").equals(5).or(undefined).query();
        expect(query).to.have.property("FilterExpression", "#NC0=:VC0");
    });

    it("Tests the 'contains' method.", () => {
        const query = Builder.scan("param1").contains("Value").query();

        expect(query).to.have.property("FilterExpression", "contains(#NC0,:VC0)");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("param1");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal("Value");
    });

    it("Tests the 'containsAny' method.", () => {
        const query = Builder.scan("param1").containsAny(["Value1", "Value2", "Value3"]).query();

        expect(query).to.have.property("FilterExpression", "contains(#NC0,:VC0) OR contains(#NC0,:VC1) OR contains(#NC0,:VC2)");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("param1");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal("Value1");
        expect(query.ExpressionAttributeValues[":VC1"]).to.equal("Value2");
        expect(query.ExpressionAttributeValues[":VC2"]).to.equal("Value3");
    });

    it("Tests the 'containsAny' method works with a single item.", () => {
        const query = Builder.scan("param1").containsAny("Value1").query();

        expect(query).to.have.property("FilterExpression", "contains(#NC0,:VC0)");
        expect(query.ExpressionAttributeNames["#NC0"]).to.equal("param1");
        expect(query.ExpressionAttributeValues[":VC0"]).to.equal("Value1");
    });

    it("Tests that a scan is created with a previous scan query.", () => {
        const firstQuery = Builder.scan("param1").contains("Value1").and("param2").equals("Value2").query();
        const secondQuery = Builder.scan(firstQuery).or("param2").equals(3).query();

        expect(secondQuery).to.have.property("FilterExpression", "contains(#NC0,:VC0) AND #NC1=:VC1 OR #NC1=:VC2");
        expect(secondQuery.ExpressionAttributeNames["#NC0"]).to.equal("param1");
        expect(secondQuery.ExpressionAttributeNames["#NC1"]).to.equal("param2");
        expect(secondQuery.ExpressionAttributeValues[":VC0"]).to.equal("Value1");
        expect(secondQuery.ExpressionAttributeValues[":VC1"]).to.equal("Value2");
        expect(secondQuery.ExpressionAttributeValues[":VC2"]).to.equal(3);
    });

    it("Tests that a scan is created with a previous scan query and is inclusive.", () => {
        const firstQuery = Builder.scan("param1").contains("Value1").and("param2").equals("Value2").query();
        const secondQuery = Builder.scan(firstQuery, true).or("param2").equals(3).query();

        expect(secondQuery).to.have.property("FilterExpression", "(contains(#NC0,:VC0) AND #NC1=:VC1) OR #NC1=:VC2");
        expect(secondQuery.ExpressionAttributeNames["#NC0"]).to.equal("param1");
        expect(secondQuery.ExpressionAttributeNames["#NC1"]).to.equal("param2");
        expect(secondQuery.ExpressionAttributeValues[":VC0"]).to.equal("Value1");
        expect(secondQuery.ExpressionAttributeValues[":VC1"]).to.equal("Value2");
        expect(secondQuery.ExpressionAttributeValues[":VC2"]).to.equal(3);
    });

    describe("With condition", () => {
        it("Tests the appropriate parameters are returned with condition.", () => {
            const query = Builder.withCondition("param1").containsAny(["Value1", "Value2", "Value3"]).and("param2").equals(2).or("param3").doesNotExist.query();

            expect(query).to.have.property("ConditionExpression", "contains(#NC0,:VC0) OR contains(#NC0,:VC1) OR contains(#NC0,:VC2) AND #NC1=:VC3 OR attribute_not_exists(#NC2)");
            expect(query.ExpressionAttributeNames["#NC0"]).to.equal("param1");
            expect(query.ExpressionAttributeNames["#NC1"]).to.equal("param2");
            expect(query.ExpressionAttributeNames["#NC2"]).to.equal("param3");
            expect(query.ExpressionAttributeValues[":VC0"]).to.equal("Value1");
            expect(query.ExpressionAttributeValues[":VC1"]).to.equal("Value2");
            expect(query.ExpressionAttributeValues[":VC2"]).to.equal("Value3");
            expect(query.ExpressionAttributeValues[":VC3"]).to.equal(2);
        });

        it("Tests that a condition is created with a previous condition query.", () => {
            const firstQuery = Builder.withCondition("param1").containsAny(["Value1", "Value2", "Value3"]).and("param2").equals(2).or("param3").doesNotExist.query();
            const secondQuery = Builder.withCondition(firstQuery).or("param1").equals(5).query();

            expect(secondQuery).to.have.property("ConditionExpression", "contains(#NC0,:VC0) OR contains(#NC0,:VC1) OR contains(#NC0,:VC2) AND #NC1=:VC3 OR attribute_not_exists(#NC2) OR #NC0=:VC4");
            expect(secondQuery.ExpressionAttributeNames["#NC0"]).to.equal("param1");
            expect(secondQuery.ExpressionAttributeNames["#NC1"]).to.equal("param2");
            expect(secondQuery.ExpressionAttributeNames["#NC2"]).to.equal("param3");
            expect(secondQuery.ExpressionAttributeValues[":VC0"]).to.equal("Value1");
            expect(secondQuery.ExpressionAttributeValues[":VC1"]).to.equal("Value2");
            expect(secondQuery.ExpressionAttributeValues[":VC2"]).to.equal("Value3");
            expect(secondQuery.ExpressionAttributeValues[":VC3"]).to.equal(2);
            expect(secondQuery.ExpressionAttributeValues[":VC4"]).to.equal(5);
        });

        it("Tests that a condition is created with a previous condition query and is inclusive.", () => {
            const firstQuery = Builder.withCondition("param1").containsAny(["Value1", "Value2", "Value3"]).and("param2").equals(2).or("param3").doesNotExist.query();
            const secondQuery = Builder.withCondition(firstQuery, true).or("param1").equals(5).query();

            expect(secondQuery).to.have.property("ConditionExpression", "(contains(#NC0,:VC0) OR contains(#NC0,:VC1) OR contains(#NC0,:VC2) AND #NC1=:VC3 OR attribute_not_exists(#NC2)) OR #NC0=:VC4");
            expect(secondQuery.ExpressionAttributeNames["#NC0"]).to.equal("param1");
            expect(secondQuery.ExpressionAttributeNames["#NC1"]).to.equal("param2");
            expect(secondQuery.ExpressionAttributeNames["#NC2"]).to.equal("param3");
            expect(secondQuery.ExpressionAttributeValues[":VC0"]).to.equal("Value1");
            expect(secondQuery.ExpressionAttributeValues[":VC1"]).to.equal("Value2");
            expect(secondQuery.ExpressionAttributeValues[":VC2"]).to.equal("Value3");
            expect(secondQuery.ExpressionAttributeValues[":VC3"]).to.equal(2);
            expect(secondQuery.ExpressionAttributeValues[":VC4"]).to.equal(5);
        });
    });
});
