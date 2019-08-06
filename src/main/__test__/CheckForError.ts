/**
 * Copyright 2019 XAPPmedia
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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