import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";

import * as Backoff from "../../main/utils/Backoff";

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

        it("Tests that the back off retries each time.", async () => {
            const callback = Sinon.stub();
            callback.returns(Promise.reject(new Error("Error per requirement of the test.")));
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
            callback.returns(Promise.reject(error));
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
            callback.returns(Promise.reject(new Error("Error per requirement of the test.")));
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
    });

    describe.only("Backoff obj", () => {
        let obj: any;
        let error: Error = new Error("Error per requirement of the test.");

        beforeEach(() => {
            obj = {
                attrib1: 1,
                attrib2: "Cheese",
                promiseFunc1: Sinon.stub().returns(Promise.resolve(1)),
                objectFunc1: Sinon.stub().returns(2),
                rejectFunc1: Sinon.stub().returns(Promise.reject(error)),
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
    });
});

function constant(e: any) {
    return 1;
}