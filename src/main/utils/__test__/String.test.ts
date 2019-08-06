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
import * as StringUtils from "../String";

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

        it("Throws an error if the size is negative.", () => {
            let caughtError: Error;
            try {
                StringUtils.randomString(-5);
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.exist;
        });
    });
});