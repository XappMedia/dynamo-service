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

import * as Sinon from "sinon";
import { StringKeys } from "../types/StringKeys";

export interface SpyObj<T extends object> {
    reset(): void;
    restore(): void;
    stub(func: StringKeys<T>): Sinon.SinonStub;
    restoreStub(func: StringKeys<T>): Sinon.SinonStub;
}

export type SpiedObj<T extends object> = SpyObj<T> & T;

interface StubCache {
    [func: string]: Sinon.SinonStub;
}

export function spy<T extends object>(obj: T): SpiedObj<T> {
    const stubCache: StubCache = {};
    const sandbox = Sinon.createSandbox();
    // Typescript isn't happy with what we're doing.
    const spy: any = {
        reset(): void {
            sandbox.resetHistory();
            sandbox.resetBehavior();
        },
        restore(): void {
            return sandbox.restore();
        },
        stub(func: StringKeys<T>): Sinon.SinonStub {
            this[func].restore();
            const stub = sandbox.stub(obj, func);
            stubCache[func] = stub;
            return stub;
        },
        restoreStub(func: StringKeys<T>) {
            const stub = stubCache[func];
            if (stub) {
                stubCache[func] = undefined;
                stub.restore();
                this[func] = sandbox.spy(obj, func);
            }
        }
    };
    console.log("SPYING", obj);
    for (let key in obj) {
        console.log("KEY", key);
        if (key === "reset" || key === "restore" || key === "stub" || key === "restoreStub") {
            throw new Error("Can not spy object. It contains key " + key);
        }
        if (typeof obj[key] === "function") {
            console.log("SPYUING ON ", key);
            spy[key] = sandbox.spy(obj, key);
        } else {
            spy[key] = obj[key];
        }
    }
    return spy;
}