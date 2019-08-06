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
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import * as Backoff from "../Backoff";

const defaultFailover = Backoff.DEFAULT_FAILOVER_TIME;
const defaultBackofCoefficient = Backoff.DEFAULT_BACKOFF_COEFFICIENT;
const defaultRetries = Backoff.DEFAULT_RETRY_ATTEMPTS;

Chai.use(SinonChai);
const expect = Chai.expect;

describe("Backoff", () => {

    describe("linearTime", () => {
        it("Tests that the LinearTime function provides values in linear time with default failover.",
            verify(Backoff.linearTime(), defaultFailover));

        it("Tests that the LinearTime function provides values in linear time with non-default failover.",
            verify(Backoff.linearTime(123), 123));

        function verify(linear: (num: number) => number, failover: number) {
            return () => {
                for (let i = 0; i < 50; ++i) {
                    expect(linear(i)).to.equal(failover * i);
                }
            };
        }
    });

    describe("ExponentialTime", () => {
        it("Tests that the ExponentialTime function provides values in linear time with default failover.",
            verify(Backoff.exponentialTime(), defaultFailover, defaultBackofCoefficient));

        it("Tests that the ExponentialTime function provides values in linear time with non-default values.",
            verify(Backoff.exponentialTime(123, 4), 123, 4));

        function verify(exponential: (num: number) => number, failover: number, backoffCoefficient: number) {
            return () => {
                for (let i = 0; i < 50; ++i) {
                    expect(exponential(i)).to.equal(failover * Math.pow(backoffCoefficient, i));
                }
            };
        }
    });

    describe("backoff", () => {
        it("Tests that the callback is called.", async () => {
            const callback = Sinon.stub();
            await Backoff.backOff(undefined, callback);
            expect(callback).to.have.been.calledOnce;
        });

        it("Tests that the callback gets the arguments passed.", async () => {
            const callback = Sinon.stub();
            await Backoff.backOff(undefined, callback, "One", 2, "Three", { Four: "Five" });
            expect(callback).to.be.calledWithMatch("One", 2, "Three", { Four: "Five" });
        });

        it("Tests that the result of a promise is returned.", async () => {
            const callback = Sinon.stub();
            callback.returns(Promise.resolve(2));
            const value = await Backoff.backOff(undefined, callback);
            expect(value).to.equal(2);
        });

        it("Tests that the result is returned.", async () => {
            const callback = Sinon.stub();
            callback.returns(3);
            const value = await Backoff.backOff(undefined, callback);
            expect(value).to.equal(3);
        });

        it("Tests that the back off retries each time.", async () => {
            const callback = Sinon.stub();
            callback.callsFake(() => Promise.reject(new Error("Error per requirement of the test.")));
            try {
                await Backoff.backOff({
                    failOffStrategy: constant
                }, callback);
            } catch (e) {
                // save
            }
            expect(callback).to.be.callCount(defaultRetries);
        });

        it("Tests that the error thrown by the callback is thrown by the backoff.", async () => {
            const callback = Sinon.stub();
            const error = new Error("Error per requirement of the test.");
            callback.callsFake(() => Promise.reject(error));
            let caughtError: Error;
            try {
                await Backoff.backOff({
                    failOffStrategy: constant
                }, callback);
            } catch (e) {
                // save
                caughtError = e;
            }
            expect(caughtError).to.deep.equal(error);
        });

        it("Tests that the retries can be overridden.", async () => {
            const callback = Sinon.stub();
            callback.callsFake(() => Promise.reject(new Error("Error per requirement of the test.")));
            try {
                await Backoff.backOff({
                    retryAttempts: 2,
                    failOffStrategy: constant
                }, callback);
            } catch (e) {
                // save
            }
            expect(callback).to.be.calledTwice;
        });

        it("Tests that the shouldRetry", async () => {
            const error = new Error("Error per requirement of the test.");
            const callback = Sinon.stub();
            const shouldRetry = Sinon.stub().returns(true);
            callback.callsFake(() => Promise.reject(error));
            try {
                await Backoff.backOff({
                    shouldRetry
                }, callback);
            } catch (e) {
                // save
            }
            expect(shouldRetry).to.have.callCount(defaultRetries - 1);
            expect(shouldRetry).to.have.always.been.calledWith(error);
        });
    });

    describe("Backoff func", () => {
        let error: Error = new Error("Error per requirement of the test.");

        let promiseFunc1: Sinon.SinonStub;
        let resultFunc1: Sinon.SinonStub;
        let rejectFunc1: Sinon.SinonStub;
        let throwsFunc1: Sinon.SinonStub;

        beforeEach(() => {
            promiseFunc1 = Sinon.stub().returns(Promise.resolve(1));
            resultFunc1 = Sinon.stub().returns(2);
            rejectFunc1 = Sinon.stub().callsFake(() => Promise.reject(error));
            throwsFunc1 = Sinon.stub().throws(error);
        });

        it("Tests that the promise func returns the correct value.", async () => {
            const backoff = Backoff.backOffFunc(promiseFunc1);
            const value = await backoff(1, 2, 3, 4, 5);
            expect(value).to.equal(1);
        });

        it("Tests that the promise func to be called with the correct values.", async () => {
            const backoff = Backoff.backOffFunc(promiseFunc1);
            await backoff(1, 2, 3, 4, 5);
            expect(promiseFunc1).to.be.calledWith(1, 2, 3, 4, 5);
        });

        it("Tests that the results func to return correct values.", async () => {
            const backoff = Backoff.backOffFunc(resultFunc1);
            const value = await backoff(1, 2, 3, 4, 5);
            expect(value).to.equal(2);
        });

        it("Tests that the reject func throws an error.", async () => {
            const backoff = Backoff.backOffFunc(rejectFunc1);
            let caughtError: Error;
            try {
                await backoff(1, 2, 3, 4, 5);
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.deep.equal(error);
            expect(rejectFunc1).to.have.callCount(defaultRetries);
        });

        it("Tests that the throws func throws an error.", async () => {
            const backoff = Backoff.backOffFunc(throwsFunc1);
            let caughtError: Error;
            try {
                await backoff(1, 2, 3, 4, 5);
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.deep.equal(error);
            expect(throwsFunc1).to.have.callCount(defaultRetries);
        });

        it("Tests that the retry strategy is called with the props.", async () => {
            const retryStrat = Sinon.stub();
            retryStrat.onFirstCall().returns(true);
            retryStrat.onSecondCall().returns(true);
            retryStrat.onThirdCall().returns(false);
            const backoff = Backoff.backOffFunc(throwsFunc1, { shouldRetry: retryStrat });
            let caughtError: Error;
            try {
                await backoff(1, 2, 3, 4, 5);
            } catch (e) {
                caughtError = e;
            }
            expect(caughtError).to.deep.equal(error);
            expect(throwsFunc1).to.have.callCount(3);
            expect(retryStrat).to.have.callCount(3);
            expect(retryStrat).to.have.always.been.calledWithMatch(error);
        });
    });

    describe("Backoff obj", () => {
        let obj: any;
        let error: Error = new Error("Error per requirement of the test.");

        beforeEach(() => {
            obj = {
                attrib1: 1,
                attrib2: "Cheese",
                promiseFunc1: Sinon.stub().returns(Promise.resolve(1)),
                objectFunc1: Sinon.stub().returns(2),
                rejectFunc1: Sinon.stub().callsFake(() => Promise.reject(error)),
                throwsFunc1: Sinon.stub().throws(error)
            };
        });

        it("Tests that the promiseFunc1 gets called with the appropriate parameters.", async () => {
            const copy = { ...obj };
            Backoff.backoffObj(copy);
            await copy.promiseFunc1(1, 2, 3, 4);
            expect(obj.promiseFunc1).to.have.been.calledWith(1, 2, 3, 4);
        });

        it("Tests that the promiseFunc1 result is captured which returns a Promise.", async () => {
            const copy = { ...obj };
            Backoff.backoffObj(copy);
            const result = await copy.promiseFunc1(1, 2, 3, 4);
            expect(result).to.equal(1);
        });

        it("Tests that the objectFunc1 result is captured which returns a straight object.", async () => {
            const copy = { ...obj };
            Backoff.backoffObj(copy);
            const result = await copy.objectFunc1(1, 2, 3, 4);
            expect(result).to.equal(2);
        });

        it("Tests that the backoff is called with a failing function.", async () => {
            const copy = { ...obj };
            Backoff.backoffObj(copy);
            let caughtE: Error;
            try {
                await copy.rejectFunc1(1, 2, 3, 4);
            } catch (e) {
                caughtE = e;
            }
            expect(obj.rejectFunc1).to.have.callCount(defaultRetries);
            expect(caughtE).to.deep.equal(error);
        });

        it("Tests that the backoff is called with a throwing function.", async () => {
            const copy = { ...obj };
            Backoff.backoffObj(copy);
            let caughtE: Error;
            try {
                await copy.throwsFunc1(1, 2, 3, 4);
            } catch (e) {
                caughtE = e;
            }
            expect(obj.throwsFunc1).to.have.callCount(defaultRetries);
            expect(caughtE).to.deep.equal(error);
        });
    });
});

function constant(e: any) {
    return 1;
}