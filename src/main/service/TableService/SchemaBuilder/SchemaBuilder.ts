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

import {
    isBooleanSchema,
    isDateSchema,
    isDynamoStringSchema,
    isListSchema,
    isMappedListSchema,
    isMapSchema,
    isMultiTypeSchema,
    isNumberSchema,
    KeySchema} from "../../KeySchema";
import { UpdateBody } from "../TableService";
import BooleanSchemaBuilder from "./Boolean/BooleanSchemaBuilder";
import DateSchemaBuilder from "./Date/DateSchemaBuilder";
import ListSchemaBuilder from "./List/ListSchemaBuilder";
import MapSchemaBuilder from "./Map/MapSchemaBuilder";
import MappedListSchemaBuilder from "./MappedList/MappedListSchemaBuilder";
import MultiTypeSchemaBuilder from "./MultiType/MultiTypeSchemaBuilder";
import NormalSchemaBuilder from "./Normal/NormalSchemaBuilder";
import NumberSchemaBuilder from "./Number/NumberSchemaBuilder";
import StringSchemaBuilder from "./String/StringSchemaBuilder";

export interface SchemaBuilder {
    validateObjectAgainstSchema(object: any): string[];
    validateUpdateObjectAgainstSchema(updateObj: UpdateBody<any>): string[];
    convertObjectToSchema(baseObject: any): any;
    convertObjectFromSchema(dynamoBaseObject: any): any;
    convertObjectFromJavascript(baseObject: any): any;
    convertObjectToJavascript(baseObject: any): any;
    convertUpdateObjectToSchema(baseObject: UpdateBody<any>): UpdateBody<any>;
}

export function getSchemaBuilder(key: string, schema: KeySchema) {
    if (isDynamoStringSchema(schema)) {
        return new StringSchemaBuilder(key, schema);
    }
    if (isDateSchema(schema)) {
        return new DateSchemaBuilder(key, schema);
    }
    if (isBooleanSchema(schema)) {
        return new BooleanSchemaBuilder(key, schema);
    }
    if (isNumberSchema(schema)) {
        return new NumberSchemaBuilder(key, schema);
    }
    if (isListSchema(schema)) {
        return new ListSchemaBuilder(key, schema);
    }
    if (isMapSchema(schema)) {
        return new MapSchemaBuilder(key, schema);
    }
    if (isMultiTypeSchema(schema)) {
        return new MultiTypeSchemaBuilder(key, schema);
    }
    if (isMappedListSchema(schema)) {
        return new MappedListSchemaBuilder(key, schema);
    }
    return new NormalSchemaBuilder(key, schema);
}