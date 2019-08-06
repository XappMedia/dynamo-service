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

import { MapMapAttribute, MapSchema } from "../../../KeySchema";
import { UpdateBody } from "../Normal/NormalSchemaBuilder";
import { Validator } from "../Normal/Validator";

export function isOnlyRequiredAttributesObjectValidator(): Validator<any, MapMapAttribute | MapSchema> {
    return (key, schema, obj) => {
        const { onlyAllowDefinedAttributes, attributes } = schema;
        if (obj && onlyAllowDefinedAttributes && attributes) {
            const unknownKeys = getUnKnownKeys(obj, attributes);
            if (unknownKeys.length > 0) {
                return `Map attribute "${key}" has forbidden keys "${unknownKeys.join(", ")}".`;
            }
        }
        return undefined;
    };
}

export function isOnlyRequiredAttributesUpdateObjectValidator(): Validator<UpdateBody<any>, MapMapAttribute | MapSchema> {
    return (key, schema, obj) => {
        const { onlyAllowDefinedAttributes, attributes } = schema;
        const { set } = obj;
        if (set && set[key] && onlyAllowDefinedAttributes && attributes) {
            const unknownKeys = getUnKnownKeys(set[key], attributes);
            if (unknownKeys.length > 0) {
                return `Map attribute "${key}" has forbidden keys "${unknownKeys.join(", ")}".`;
            }
        }
        return undefined;
    };
}

function getUnKnownKeys(obj: object, attributes: object): string[] {
    const allKeys = Object.keys(obj);
    const knownKeys = Object.keys(attributes);
    return allKeys.filter((k) => knownKeys.indexOf(k) < 0);
}