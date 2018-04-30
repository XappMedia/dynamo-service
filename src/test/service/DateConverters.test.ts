import * as Chai from "chai";

import * as Converters from "../../main/service/Converters";

const expect = Chai.expect;

describe("DateConverters", () => {
    describe("toIso", () => {
        it("Tests that the to object gives a string in ISO format.", () => {
            const date = new Date(2018, 1, 1);
            expect(Converters.toIso.toObj(date)).to.equal(date.toISOString());
        });

        it("Tests that the to object handles an undefined.", () => {
            expect(Converters.toIso.toObj(undefined)).to.be.undefined;
        });

        it("Tests that the from object gives the correct date.", () => {
            const date = new Date(2018, 1, 1);
            expect(Converters.toIso.fromObj(date.toISOString())).to.deep.equal(date);
        });

        it("Tests that the from object handles an undefined.", () => {
            expect(Converters.toIso.fromObj(undefined)).to.be.undefined;
        });
    });

    describe("toTimestamp", () => {
        it("Tests that the to object gives a string in Timestamp format.", () => {
            const date = new Date(2018, 1, 1);
            expect(Converters.toTimestamp.toObj(date)).to.equal(date.getTime());
        });

        it("Tests that the to object handles an undefined.", () => {
            expect(Converters.toTimestamp.toObj(undefined)).to.be.undefined;
        });

        it("Tests that the from object gives the correct date.", () => {
            const date = new Date(2018, 1, 1);
            expect(Converters.toTimestamp.fromObj(date.getTime())).to.deep.equal(date);
        });

        it("Tests that the from object handles an undefined.", () => {
            expect(Converters.toTimestamp.fromObj(undefined)).to.be.undefined;
        });
    });
});