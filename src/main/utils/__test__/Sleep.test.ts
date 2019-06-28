import * as Chai from "chai";

import * as Sleep from "../Sleep";

const expect = Chai.expect;

describe("Sleep", () => {
    it("It tests that it does pause execution a bit.", async () => {
        const time = new Date().getTime();
        await Sleep.sleep(500);
        const newTime = new Date().getTime();

        expect(newTime - time).to.be.at.least(500).and.at.most(600);
    });
});