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

import { DynamoNumberSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";
import { Validator } from "../Normal/Validator";

export { DynamoNumberSchema };

export class NumberSchemaBuilder extends NormalSchemaBuilder<DynamoNumberSchema> {
    constructor(key: string, schema: DynamoNumberSchema) {
        super(key, schema, "number");

        if (schema.integer) {
            this.addPutValidator(checkInteger());
            this.addUpdateBodyValidator((key, schema, obj) => checkInteger()(key, schema, obj.set ? obj.set[key] : undefined));
        }
    }
}

function checkInteger(): Validator<any, DynamoNumberSchema> {
    return (key, schema, item) => {
        if (item) {
            if (!Number.isInteger(item)) {
                return `Key "${key}" is not an integer.`;
            }
        }
    };
}

export default NumberSchemaBuilder;