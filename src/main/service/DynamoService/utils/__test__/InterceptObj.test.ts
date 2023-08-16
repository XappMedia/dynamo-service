import * as Chai from "chai";
import * as Sinon from "sinon";
import * as SinonChai from "sinon-chai";
import { intercept, interceptObj } from "../InterceptObj";
import { Interceptor } from "../../IDynamoService";

Chai.use(SinonChai);
const expect = Chai.expect;

interface Obj {
    param1: string;
}

describe(intercept.name, () => {

    it("Processes through all the interceptors.", () => {
        const int1: Interceptor<Obj> = Sinon.stub().callsFake((obj) => ({ ...obj, newValue1: "Value" }));
        const int2: Interceptor<Obj> = Sinon.stub().callsFake((obj) => ({ ...obj, newValue2: "Value" }));;

        const result = intercept([int1, int2], { param1: "Value" });

        expect(result).to.deep.equal({
            param1: "Value",
            newValue1: "Value",
            newValue2: "Value"
        });
    });

    it("Returns an error if one of the interceptors don't return an object.", () => {

        const int1: Interceptor<Obj> = Sinon.stub().callsFake((obj) => ({ ...obj, newValue1: "Value" }));
        const int2: Interceptor<Obj> = Sinon.stub().callsFake(() => undefined);

        let caughtError: Error;
        try {
            intercept([int1, int2], { param1: "Value" });
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError).to.be.instanceOf(Error);
    });
});

describe(interceptObj.name, () => {
    it("Processes through a single object", () => {
        const int1: Interceptor<Obj> = Sinon.stub().callsFake((obj) => ({ ...obj, newValue1: "Value" }));
        const int2: Interceptor<Obj> = Sinon.stub().callsFake((obj) => ({ ...obj, newValue2: "Value" }));;

        const result = interceptObj([int1, int2], { param1: "Value" });

        expect(result).to.deep.equal({
            param1: "Value",
            newValue1: "Value",
            newValue2: "Value"
        });
    });

    it("Processes through multiple objects", () => {
        const int1: Interceptor<Obj> = Sinon.stub().callsFake((obj) => ({ ...obj, newValue1: "Value" }));
        const int2: Interceptor<Obj> = Sinon.stub().callsFake((obj) => ({ ...obj, newValue2: "Value" }));;

        const result = interceptObj([int1, int2], [{ param1: "Value" }, { param2: "Value" }]);

        expect(result).to.deep.equal([{
            param1: "Value",
            newValue1: "Value",
            newValue2: "Value"
        }, {
            param2: "Value",
            newValue1: "Value",
            newValue2: "Value"
        }]);
    })
})