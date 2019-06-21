import * as Chai from "chai";

const expect = Chai.expect;

export function expectToHaveNoErrors(errors: string | string[]) {
    if (errors) {
        if (Array.isArray(errors)) {
            expect(errors, "There were errors returned.").to.have.length(0);
        } else {
            expect(errors, "There was an error returned.").to.have.length(1);
        }
    }
    // Else congrats, no errors.
}

export function expectToHaveErrors(errors: string | string[], expectedErrors: string | string[] = []) {
    expect(errors, "No errors were returned.").to.exist;
    const allErrors = [].concat(errors);
    const allExpectedErrors = [].concat(expectedErrors);
    expect(allErrors).to.include.members(allExpectedErrors);
}