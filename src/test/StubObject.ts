import * as Sinon from "sinon";

export interface SpiedObj {
    reset(): void;
    restore(): void;
}

export function spy<T>(obj: T): SpiedObj & T {
    const sandbox = Sinon.sandbox.create();
    // Typescript isn't happy with what we're doing.
    const spy: any = {
        reset(): void {
            return sandbox.reset();
        },
        restore(): void {
            return sandbox.restore();
        }
    };
    for (let key in obj) {
        console.log(key);
        console.log(typeof obj[key]);
        if (key === "reset" || key === "restore") {
            throw new Error("Can not spy object. It contains key " + key);
        }
        if (typeof obj[key] === "function") {
            spy[key] = Sinon.spy(obj, key);
        }
    };
    return spy;
}