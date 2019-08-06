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

import { UpdateBody } from "./NormalSchemaBuilder";
import { Validator } from "./Validator";

// tslint:disable:no-null-keyword
export function isCorrectValueTypeValidator(expectedType: string): Validator<any> {
    return (key, schema, obj) => {
        if (obj != null && typeof obj !== expectedType) {
            return `Key "${key}" is expected to be of type ${expectedType} but got ${typeof obj}.`;
        }
    };
}

export function isCorrectValueTypeUpdateBodyValidator(expectedType: string): Validator<UpdateBody<any>> {
    return (key, schema, obj) => {
        const { set } = obj;
        if (set && set[key] != null && typeof set[key] !== expectedType) {
            return `Key "${key}" is expected to be of type ${expectedType} but got ${typeof set[key]}.`;
        }
    };
}