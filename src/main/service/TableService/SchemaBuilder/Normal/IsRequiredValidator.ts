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

// tslint:disable:no-null-keyword != null checks for both undefined and null
export function isRequiredPutObjectValidator(): Validator<any> {
    return (key, schema, obj) => {
        if (isRequired(schema)) {
            if (obj == null) {
                return `Key "${key}" is required but is not defined.`;
            }
        }
    };
}

export function isRequiredUpdateBodyValidator(): Validator<UpdateBody<any>> {
    return (key, schema, obj) => {
        const { set, remove } = obj;
        if (!isRequired(schema)) {
            // Then user can remove all he wants.
            return undefined;
        }

        if ((set && set.hasOwnProperty(key) && set[key] == null ) || // If it's in set
            (remove && remove.indexOf(key) >= 0)) { // or in remove
                // Then we don't want it changing.
                return `Key "${key}" is required and can not be removed.`;
        }
    };
}

function isRequired(schema: { required?: boolean, primary?: boolean, sort?: boolean }) {
    return schema.required || schema.primary || schema.sort || false;
}