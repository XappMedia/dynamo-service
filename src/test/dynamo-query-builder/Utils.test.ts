import * as Chai from "chai";

import * as Utils from "../../main/dynamo-query-builder/Utils";

const expect = Chai.expect;

describe.only("Utils", () => {
    describe("Validate expression", () => {
        it("Tests that an undefined expression returned true.", () => {
            expect(Utils.validateExpression()).to.be.true;
        });

        it("Tests that an empty expression returns true.", () => {
            expect(Utils.validateExpression("")).to.be.true;
        });

        const comparators = [
            "=", "!=", "<>", "<", "<=", ">", ">="
        ];

        for (const comparator of comparators) {
            describe(comparator, () => {
                it(`Tests that ${comparator} is validated.`, () => {
                    expect(Utils.validateExpression(`a${comparator}b`), "Case where comparator is together was not handled.").to.be.true;
                    expect(Utils.validateExpression(`a ${comparator} b`), "Case where comparator is apart was not handled.").to.be.true;
                });

                it(`Test that false is returned if the left operator is not valid.`, () => {
                    expect(Utils.validateExpression(`${comparator} b`)).to.be.false;
                });

                it("Tests that false is returned if the right operator is missing.", () => {
                    expect(Utils.validateExpression(`a ${comparator}`)).to.be.false;
                });
            });
        }
    });
});