import * as Chai from "chai";
import * as StringUtils from "../../main/utils/String";

const expect = Chai.expect;

describe("String", () => {
    describe("RandomString", () => {
        it("Tests that two strings generated are not the same.", () => {
            // Technically speaking it's possible for two random strings to be equal, but
            // it's unlikely, so whatever. If it fails, then try again.
            expect(StringUtils.randomString()).to.not.equal(StringUtils.randomString());
        });

        it("Tests that the string generated has the length specified.", () => {
            expect(StringUtils.randomString(15)).to.have.length(15);
        });
    });
});