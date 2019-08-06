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