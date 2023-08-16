import * as Chai from "chai";
import { UpdateBody } from "../../IDynamoService";
import { transferUndefinedToRemove } from "../UpdateBodyUtils";

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