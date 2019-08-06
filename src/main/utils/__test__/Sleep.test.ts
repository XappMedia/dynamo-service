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