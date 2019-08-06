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

import { UpdateBody } from "../../../DynamoService";
import { DynamoSchema, DynamoType, MultiSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";
import { getSchemaBuilder, SchemaBuilder } from "../SchemaBuilder";

export { UpdateBody, MultiSchema };

type SupportedType = DynamoType;
type AvailableSchemaBuilders = Partial<Record<SupportedType, SchemaBuilder>>;

/**
 * A schema builder where the object can be multiple types.
 *
 * It will perform validations on objects based on the type of object that
 * is inserted.
 *
 * @export
 * @class MultiTypeSchema
 * @extends {NormalSchemaBuilder}
 */
export class MultiTypeSchema implements SchemaBuilder {

    private readonly key: string;
    private readonly mySchema: MultiSchema;
    private readonly schemaBuilders: AvailableSchemaBuilders;
    private readonly schemas: DynamoSchema[];

    constructor(key: string, schema: MultiSchema) {
        this.key = key;
        this.mySchema = schema;
        this.schemaBuilders = {};
        this.schemas = [];

        const { type, schemas, ...remainingParameters } = this.mySchema;
        const schemaTypes: SupportedType[] = Object.keys(schema.schemas || {}) as SupportedType[];

        for (const type of schemaTypes) {
            const parameters = schemas[type as SupportedType];
            const typeSchema: DynamoSchema = {
                ...parameters,
                ...remainingParameters,
                type
            };
            this.schemas.push(typeSchema);
            this.schemaBuilders[type] = getSchemaBuilder(key, typeSchema);
        }
    }

    validateObjectAgainstSchema(object: any): string[] {
        try {
            const builder = this.findBuilder(object);
            return (builder) ? builder.validateObjectAgainstSchema(object) : undefined;
        } catch (e) {
            return [e.message];
        }
    }

    validateUpdateObjectAgainstSchema(updateObj: UpdateBody<any>): string[] {
        try {
            const builder = this.findBuilderByUpdate(updateObj);
            return (builder) ? builder.validateUpdateObjectAgainstSchema(updateObj) : undefined;
        } catch (e) {
            return [e.message];
        }
    }

    convertObjectToSchema(baseObject: any): any {
        const builder = this.findBuilder(baseObject);
        return (builder) ? builder.convertObjectToSchema(baseObject) : baseObject;
    }

    convertObjectFromSchema(dynamoBaseObject: any): any {
        const builder = this.findBuilder(dynamoBaseObject);
        return (builder) ? builder.convertObjectFromSchema(dynamoBaseObject) : dynamoBaseObject;
    }

    convertObjectFromJavascript(baseObject: any): any {
        const builder = this.findBuilder(baseObject);
        return (builder) ? builder.convertObjectFromJavascript(baseObject) : baseObject;
    }

    convertObjectToJavascript(baseObject: any): any {
        const builder = this.findBuilder(baseObject);
        return (builder) ? builder.convertObjectToJavascript(baseObject) : baseObject;
    }

    convertUpdateObjectToSchema(baseObject: UpdateBody<any>): UpdateBody<any> {
        const builder = this.findBuilderByUpdate(baseObject);
        return (builder) ? builder.convertUpdateObjectToSchema(baseObject) : baseObject;
    }

    private findBuilder(obj: any) {
        // tslint:disable:no-null-keyword
        if (obj == null || !obj.hasOwnProperty(this.key)) {
        // tslint:enable:no-null-keyword
            return undefined;
        }
        const objValue = obj[this.key];
        const objType = typeof objValue;
        let schemaType: SupportedType;
        if (objType === "object") {
            schemaType = (Array.isArray(obj)) ? "L" : "M";
        } else if (objType === "number") {
            schemaType = "N";
        } else if (objType === "string") {
            schemaType = "S";
        } else if (objType === "boolean") {
            schemaType = "BOOL";
        }
        if (!schemaType || !this.schemaBuilders[schemaType]) {
            throw new Error(`Type ${objType} is not supported for key "${this.key}".`);
        }
        return this.schemaBuilders[schemaType];
    }

    private findBuilderByUpdate(obj: UpdateBody<any>) {
        const { set, remove, append } = obj;
        if (remove && remove.indexOf(this.key) >= 0) {
            // It doesn't matter what type it is in this situation. It's being removed so check with those scenarios.
            return new NormalSchemaBuilder(this.key, this.schemas[0]);
        }
        if (append && append.hasOwnProperty(this.key)) {
            const listBuilder = this.schemaBuilders["L"];
            if (!listBuilder) {
                throw new Error(`Key "${this.key}" is not of type List.`);
            }
            return listBuilder;
        }
        return this.findBuilder(set);
    }
}

export default MultiTypeSchema;