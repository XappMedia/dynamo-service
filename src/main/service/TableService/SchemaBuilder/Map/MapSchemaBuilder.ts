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

import { KeySchema, MapSchema } from "../../../KeySchema";
// import { Converter, Processor } from "../../../KeySchema";
import NormalSchemaBuilder, { UpdateBody } from "../Normal/NormalSchemaBuilder";
import { Validator } from "../Normal/Validator";
import { getSchemaBuilder } from "../SchemaBuilder";
import { isOnlyRequiredAttributesObjectValidator, isOnlyRequiredAttributesUpdateObjectValidator } from "./IsOnlyRequiredAttributesValidator2";

export { MapSchema };

export class MapSchemaBuilder extends NormalSchemaBuilder<MapSchema> {
    constructor(key: string, schema: MapSchema) {
        super(key, schema, "object");

        if (schema.onlyAllowDefinedAttributes) {
            this.addPutValidator(isOnlyRequiredAttributesObjectValidator());
            this.addUpdateBodyValidator(isOnlyRequiredAttributesUpdateObjectValidator());
        }

        if (schema.attributes) {
            this.addPutValidator(attributesValidator());
            this.addUpdateBodyValidator(attributesUpdateValidator());
        }
    }

    convertObjectToSchema(baseObject: any): any {
        let returnObj = super.convertObjectToSchema(baseObject);
        if (baseObject && baseObject.hasOwnProperty(this.key) && this.schema.attributes) {
            let subObject = returnObj[this.key];
            const attKeys = Object.keys(this.schema.attributes);
            for (const attributeKey of attKeys) {
                const attributeSchema = this.schema.attributes[attributeKey];
                const builder = getSchemaBuilder(attributeKey, attributeSchema as KeySchema);
                subObject = builder.convertObjectToSchema(subObject);
            }
            returnObj[this.key] = subObject;
        }
        return returnObj;
    }

    convertObjectFromSchema(baseObject: any): any {
        let returnObj = super.convertObjectFromSchema(baseObject);
        if (baseObject && baseObject.hasOwnProperty(this.key) && this.schema.attributes) {
            let subObject = returnObj[this.key];
            const attKeys = Object.keys(this.schema.attributes);
            for (const attributeKey of attKeys) {
                const attributeSchema = this.schema.attributes[attributeKey];
                const builder = getSchemaBuilder(attributeKey, attributeSchema as KeySchema);
                subObject = builder.convertObjectFromSchema(subObject);
            }
            returnObj[this.key] = subObject;
        }
        return returnObj;
    }

    convertUpdateObjectToSchema(updateBody: UpdateBody<any>): any {
        let returnObj = super.convertUpdateObjectToSchema(updateBody);
        if (!returnObj || !returnObj.set || !this.schema.attributes) {
            return returnObj;
        }
        const setKeys = Object.keys(returnObj.set);
        for (const setKey of setKeys) {
            const settingObj = returnObj.set[setKey];
            const splitKeys = setKey.split(".");
            const mainKey = splitKeys[0];
            if (splitKeys.length === 0 || mainKey !== this.key) {
                // It's already been converted. We're only concerned with nested attributes.
                continue;
            }
            const remainingKeys = splitKeys.slice(1);
            // Find the schemabuilder we want.
            if (this.schema.attributes.hasOwnProperty(remainingKeys[0])) {
                const attributeSchema = this.schema.attributes[remainingKeys[0]];
                const builder = getSchemaBuilder(remainingKeys[0], attributeSchema as KeySchema);
                const convertedObj = builder.convertObjectToSchema(expand(remainingKeys, settingObj));
                returnObj.set[setKey] = retrieveValue(convertedObj, remainingKeys);
            }
        }
        return returnObj;
    }
}

export default MapSchemaBuilder;

function attributesValidator(): Validator<any, MapSchema> {
    return (key, schema, obj) => {
        const { attributes } = schema;
        const errors: string[] = [];
        if (attributes) {
            const attributeKeys = Object.keys(attributes);
            for (const attributeKey of attributeKeys) {
                const attributeSchema = attributes[attributeKey];
                // The map objects are (as of writing this comment) almost identical to the Schema object, so we're going to utilize them.
                const builder = getSchemaBuilder(attributeKey, attributeSchema as KeySchema);
                const foundErrors = (obj) ? builder.validateObjectAgainstSchema(obj) : undefined;
                errors.push(...(foundErrors || []));
            }
        }
        return errors;
    };
}

function attributesUpdateValidator(): Validator<UpdateBody<any>, MapSchema> {
    const validator: Validator<UpdateBody<any>, MapSchema> = (key, schema, obj) => {
        const { attributes } = schema;
        const errors: string[] = [];
        if (attributes) {
            const attributeKeys = Object.keys(attributes);
            for (const attributeKey of attributeKeys) {
                const attributeSchema = attributes[attributeKey];
                const builder = getSchemaBuilder(attributeKey, attributeSchema as KeySchema);
                const foundErrors = builder.validateUpdateObjectAgainstSchema({
                    set: (obj.set) ? obj.set[key] : undefined,
                    append: (obj.append) ? obj.append[key] : undefined,
                    remove: removeKeyFromBeginning(key, obj.remove)
                });
                errors.push(...(foundErrors || []));
            }
        }
        return errors;
    };

    return validator;
}

function expand(keys: string[], value: any): object {
    if (keys.length === 0) {
        return {};
    }
    if (keys.length === 1) {
        return { [keys[0]]: value };
    }
    return { [keys[0]]: expand(keys.slice(1), value) };
}

function retrieveValue(obj: any, keys: string[]): any {
    if (keys.length === 0) {
        return obj;
    }
    return retrieveValue(obj[keys[0]], keys.slice(1));
}

function removeKeyFromBeginning(key: string, values: string[]) {
    if (values) {
        return values.map((v) => (v.startsWith(`${key}.`) ? v.substring(`${key}.`.length) : v));
    }
}