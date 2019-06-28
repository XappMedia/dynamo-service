import * as Chai from "chai";

import ValidationError from "../ValidationError";

const expect = Chai.expect;

describe(ValidationError.name, () => {
    it("Tests that the message remains a string.", () => {
        const error = new ValidationError("TestString");
        expect(error.message).to.equal("TestString");
    });

    it("Tests that it lists the errors if there are many.", () => {
        const error = new ValidationError(["Error1", "Error2"]);
        expect(error.message).to.equal("Errors: [ Error1,\nError2 ]");
    });
});