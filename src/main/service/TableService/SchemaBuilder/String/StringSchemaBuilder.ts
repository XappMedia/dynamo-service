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

import * as runes from "runes";
import { CharMap, DynamoStringSchema, Processor, SlugifyParams } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";
import { Validator } from "../Normal/Validator";

const slugify = require("slugify");

export { DynamoStringSchema };

export class StringSchemaBuilder extends NormalSchemaBuilder<DynamoStringSchema> {
    constructor(key: string, schema: DynamoStringSchema) {
        super(key, schema, "string");
        if (schema.slugify) {
            this.addProcessor(generateSlugifyProcessor(this.schema.slugify));
        }

        if (schema.enum) {
            this.addPutValidator(enumValidator());
            this.addUpdateBodyValidator((key, schema, item) => enumValidator()(key, schema, (item.set) ? item.set[key] : undefined));
        }

        if (schema.invalidCharacters) {
            this.addPutValidator(invalidCharacterPutValidator());
            this.addUpdateBodyValidator((key, schema, item) => invalidCharacterPutValidator()(key, schema, (item.set) ? item.set[key] : undefined));
        }

        if (schema.format) {
            this.addPutValidator(formatValidator());
            this.addUpdateBodyValidator((key, schema, item) => formatValidator()(key, schema, (item.set) ? item.set[key] : undefined));
        }
    }
}

export default StringSchemaBuilder;

function invalidCharacterPutValidator(): Validator<any, DynamoStringSchema> {
    return (key, schema, item) => {
        const { invalidCharacters } = schema;
        if (item) {
            const invalidateCharacterRegex = new RegExp(`[${invalidCharacters}]`);
            if (invalidateCharacterRegex.test(item)) {
                return `Key "${key}" contains invalid characters "${invalidCharacters}".`;
            }
        }
    };
}

function formatValidator(): Validator<any, DynamoStringSchema> {
    return (key, schema, item) => {
        const { format } = schema;
        if (!!item && !format.test(item)) {
            return `Key "${key}" does not match the required format "${format}".`;
        }
    };
}

function enumValidator(): Validator<any, DynamoStringSchema> {
    return (key, schema, item) => {
        const allowedEnum = schema.enum;
        if (item) {
            const enumRegex = new RegExp(`^(${allowedEnum.join("|")})$`);
            if (!enumRegex.test(item)) {
                return `Key "${key}" is not one of the values "${allowedEnum.join(", ")}".`;
            }
        }
    };
}

function generateSlugifyProcessor(params: boolean | SlugifyParams): Processor<string> {
    return (value: string) => {
        if (typeof params === "boolean") {
            return slugify(value);
        } else if (typeof params === "object") {
            const { charMap, ...slugParams } = params;
            // If the user overrides the "remove", then the slugify util will leave
            // in a bunch of characters that we don't want.
            // So to be fully solid, we'll do two passes.  One with the removes, and one without.
            return slugify(slugify(replaceChars(value, charMap), slugParams).trim());
        }
    };
}


function replaceChars(stringValue: string, charMap: CharMap): string {
    if (!charMap) {
        return stringValue;
    }

    // tslint:disable:no-null-keyword checking for null and undefined.
    return runes(stringValue).reduce((replacement, ch) => replacement + (charMap[ch] || ch), "");
    // tslint:enable:no-null-keyword
}