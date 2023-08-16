import * as Chai from "chai";
import { UpdateBody } from "../../IDynamoService";
import { getUpdateParameters, transferUndefinedToRemove } from "../UpdateBodyUtils";

const expect = Chai.expect;

describe("UpdateBodyUtils", () => {
    describe(transferUndefinedToRemove.name, () => {
        it("Moves all items in the set to the removed.", () => {
            const body: UpdateBody<any> = {
                set: {
                    param1: "Value",
                    param2: null,
                    param3: undefined,
                    param4: "",
                    param5: -1,
                    param6: 0,
                    param7: false,
                    param8: true,
                    param9: NaN,
                    param10: -0
                }
            };
            const returnBody = transferUndefinedToRemove(body);
            expect(returnBody).to.deep.equal({
                set: {
                    param1: "Value",
                    param5: -1,
                    param6: 0,
                    param7: false,
                    param8: true,
                    param10: -0
                },
                remove: ["param2", "param3", "param4", "param9"]
            });
        });
    });
});

describe.only(getUpdateParameters.name, () => {

    it("Returns the update parameters for a set.", () => {
        const updateObj: UpdateBody<any> = {
            set: {
                param1: "Value1",
                param2: "Value2"
            }
        };
        const updateParams = getUpdateParameters(updateObj);
        expect(updateParams).to.deep.equal({
            ExpressionAttributeNames: {
                "#__dynoservice_updateset_a1": "param1",
                "#__dynoservice_updateset_a3": "param2"
            },
            ExpressionAttributeValues: {
                ":__dynoservice_updateset_a2": "Value1",
                ":__dynoservice_updateset_a4": "Value2"
            },
            UpdateExpression: "set #__dynoservice_updateset_a1 = :__dynoservice_updateset_a2,#__dynoservice_updateset_a3 = :__dynoservice_updateset_a4"
        });
    });

    it("Handles dotted parameters for set", () => {
        const updateObj: UpdateBody<any> = {
            set: {
                "param1.param2": "Value1",
                param2: "Value2"
            }
        };
        const updateParams = getUpdateParameters(updateObj);
        expect(updateParams).to.deep.equal({
            ExpressionAttributeNames: {
                "#__dynoservice_updateset_a1": "param1",
                "#__dynoservice_updateset_a2": "param2",
                "#__dynoservice_updateset_a4": "param2"
            },
            ExpressionAttributeValues: {
                ":__dynoservice_updateset_a3": "Value1",
                ":__dynoservice_updateset_a5": "Value2"
            },
            UpdateExpression: "set #__dynoservice_updateset_a1.#__dynoservice_updateset_a2 = :__dynoservice_updateset_a3,#__dynoservice_updateset_a4 = :__dynoservice_updateset_a5"
        });
    });

    it("Handles append with dot", () => {
        const updateObj: UpdateBody<any> = {
            append: {
                "param1.param2": "Value1",
                param2: "Value2"
            }
        };
        const updateParams = getUpdateParameters(updateObj);
        expect(updateParams).to.deep.equal({
            ExpressionAttributeNames: {
                "#__dynoservice_updateappend_c0": "param1.param2",
                "#__dynoservice_updateappend_c1": "param2"

            },
            ExpressionAttributeValues: {
                ":__dynoservice_update_append_empty_list": [],
                ":__dynoservice_updateappend_c1": "Value1",
                ":__dynoservice_updateappend_c2": "Value2"
            },
            UpdateExpression: "set #__dynoservice_updateappend_c0 = " +
                "list_append(if_not_exists(#__dynoservice_updateappend_c0, :__dynoservice_update_append_empty_list)," +
                ":__dynoservice_updateappend_c1),#__dynoservice_updateappend_c1 = " +
                "list_append(if_not_exists(#__dynoservice_updateappend_c1, :__dynoservice_update_append_empty_list)," +
                ":__dynoservice_updateappend_c2)"
        });
    });
});