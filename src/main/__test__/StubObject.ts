import * as Sinon from "sinon";

export interface SpyObj<T extends object> {
    reset(): void;
    restore(): void;
    stub(func: keyof T): Sinon.SinonStub;
    restoreStub(func: keyof T): Sinon.SinonStub;
}

export type SpiedObj<T extends object> = SpyObj<T> & T;

interface StubCache {
    [func: string]: Sinon.SinonStub;
}

export function spy<T extends object>(obj: T): SpiedObj<T> {
    const stubCache: StubCache = {};
    const sandbox = Sinon.sandbox.create();
    // Typescript isn't happy with what we're doing.
    const spy: any = {
        reset(): void {
            sandbox.resetHistory();
            sandbox.resetBehavior();
        },
        restore(): void {
            return sandbox.restore();
        },
        stub(func: keyof T): Sinon.SinonStub {
            this[func].restore();
            const stub = sandbox.stub(obj, func);
            stubCache[func] = stub;
            return stub;
        },
        restoreStub(func: keyof T) {
            const stub = stubCache[func];
            if (stub) {
                stubCache[func] = undefined;
                stub.restore();
                this[func] = sandbox.spy(obj, func);
            }
        }
    };
    for (let key in obj) {
        if (key === "reset" || key === "restore" || key === "stub" || key === "restoreStub") {
            throw new Error("Can not spy object. It contains key " + key);
        }
        if (typeof obj[key] === "function") {
            spy[key] = sandbox.spy(obj, key);
        } else {
            spy[key] = obj[key];
        }
    }
    return spy;
}