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

import { Converter, DateFormat, DateSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";
import { isDateObjUpdateBodyValidator, isDateObjValidator } from "./DateSchemaValidator";

export { DateSchema };

export class DateSchemaBuilder extends NormalSchemaBuilder<DateSchema> {
    constructor(key: string, schema: DateSchema) {
        super(key, schema, isTimestampFormat(schema.dateFormat) ? "number" : "string");

        this.addJavascriptProcessor(generateFormatProcessor(schema.dateFormat));

        this.addPutValidator(isDateObjValidator());
        this.addUpdateBodyValidator(isDateObjUpdateBodyValidator());
    }
}

function isTimestampFormat(format?: DateFormat): format is "Timestamp" {
    return !!format && format === "Timestamp";
}

function generateFormatProcessor(): Converter<Date, string>;
function generateFormatProcessor(format: "ISO-8601"): Converter<Date, string>;
function generateFormatProcessor(format: "Timestamp"): Converter<Date, number>;
function generateFormatProcessor(format: DateFormat): Converter<Date, string> | Converter<Date, number>;
function generateFormatProcessor(format?: DateFormat): Converter<Date, string> | Converter<Date, number> {
    if (format === "Timestamp") {
        return {
            toObj: (item) => (item) ? new Date(item).getTime() : undefined,
            fromObj: (item: number) => (item) ? new Date(item) : undefined
        };
    }
    return {
        toObj: (item) => (item) ? new Date(item).toISOString() : undefined,
        fromObj: (item: string) => (item) ? new Date(item) : undefined
    };
}

export default DateSchemaBuilder;