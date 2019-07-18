import * as Chai from "chai";

const expect = Chai.expect;

/**
 * A callback function which will check if an error is thrown from the callback.
 *
 * If the callback returns a promise, then the caller will have to wait on it as a promise as well.
 *
 * @export
 * @param {(() => void | Promise<void>)} callback
 * @param instanceOf The class that is should be. Default: Error
 * @param {string} [msg] The message that the error should have.
 */
export default function checkForError(callback: () => unknown | Promise<unknown>, expectedInstanceOf?: Object, msg?: string) {
    let caughtError: Error;
    try {
        const result = callback();
        if (result instanceof Promise) {
            return result.catch(e => caughtError = e).then(() => validateError(caughtError, expectedInstanceOf, msg));
        }
    } catch (e) {
        caughtError = e;
    }
    validateError(caughtError, expectedInstanceOf, msg);
}

function validateError(caughtError: Error, expectedInstanceOf: Object = Error, msg?: string) {
    expect(caughtError, "No error was thrown.").to.exist;
    expect(caughtError, "It was not of type Error.").to.be.instanceOf(expectedInstanceOf);
    if (msg) {
        expect(caughtError).to.equal(msg);
    }
}