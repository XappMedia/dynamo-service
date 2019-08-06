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
    expect(errors.length, "No errors were returned.").to.be.greaterThan(0);
    const allErrors = [].concat(errors);
    const allExpectedErrors = [].concat(expectedErrors);
    expect(allErrors).to.include.members(allExpectedErrors);
}