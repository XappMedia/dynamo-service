import * as Chai from "chai";
import { removeUndefinedAndBlanks } from "../RemoveUndefinedAndBlanks";

const expect = Chai.expect;

describe(removeUndefinedAndBlanks.name, () => {

    it("Removes the blanks from the object.", () => {
        const obj: any = {
            param1: "",
            param2: "NotABlank",
            param3: false,
            param4: undefined,
            param5: null,
            param6: 0,
            param7: [{
                param1: null,
                param2: undefined,
                param3: "NotABlank"
            }],
            param8: {
                param1: null,
                param2: undefined,
                param3: "NotABlank",
                param4: {
                    param1: null,
                    param2: undefined,
                    param3: "NotABlank"
                }
            }
        };
        const returnObj = removeUndefinedAndBlanks(obj);
        expect(returnObj).to.deep.equal({
            param2: "NotABlank",
            param3: false,
            param6: 0,
            param7: [{
                param3: "NotABlank"
            }],
            param8: {
                param3: "NotABlank",
                param4: {
                    param3: "NotABlank"
                }
            }
        });
    });
});