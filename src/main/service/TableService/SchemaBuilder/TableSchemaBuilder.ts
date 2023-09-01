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

import { StringKeys } from "../../../types/StringKeys";
import { UpdateBody } from "../../DynamoService";
import { TableSchema } from "../../KeySchema";
import { isConstant } from "./Normal/IsConstantValidator";
import { getSchemaBuilder, SchemaBuilder } from "./SchemaBuilder";

export interface TableSchemaBuilderProps {
    /**
     * If true, objects being sent to Dynamodb will be trimmed
     * of unknown attributes while being converted.
     *
     * This will effect both PUT and UPDATE commands.
     *
     * If false, all unknown items will be retained during conversions.
     *
     * @type {boolean}
     * @memberof TableSchemaBuilderProps
     */
    trimUnknown?: boolean;

    /**
     * If true, objects being sent ot Dyanmodb will be trimmed
     * of constant attributes while being converted.
     *
     * This will *only* effect UPDATE commands.  PUT commands
     * will have all constant items.
     *
     * If false, all constant items will be retained during conversions.
     *
     * @type {boolean}
     * @memberof TableSchemaBuilderProps
     */
    trimConstants?: boolean;

    /**
     * If this is set, this will trim columns in a GET request that match
     * the regex patterns.
     *
     * This will only effect columns that are retrieved FROM dynamo.
     *
     * @type {(RegExp | RegExp[])}
     * @memberof TableSchemaBuilderProps
     */
    trimColumnsInGet?: RegExp | RegExp[];
}

export class TableSchemaBuilder<Row extends object> implements SchemaBuilder {
    private readonly schemaBuilders: SchemaBuilder[];

    private readonly props: TableSchemaBuilderProps;
    private readonly knownKeys: (StringKeys<Row>)[];
    private readonly constantKeys: (StringKeys<Row>)[];

    constructor(schema: TableSchema<Row>, props: TableSchemaBuilderProps = {}) {
        this.schemaBuilders = [];
        this.props = props;
        this.knownKeys = Object.keys(schema) as (StringKeys<Row>)[];
        this.constantKeys = [];
        for (const key of this.knownKeys) {
            const attribute = schema[key];
            this.schemaBuilders.push(getSchemaBuilder(key, attribute));
            if (isConstant(attribute)) {
                this.constantKeys.push(key);
            }
        }
    }

    validateObjectAgainstSchema(object: any): string[] {
        const errors: string[] = [];
        for (const builder of this.schemaBuilders) {
            const foundErrors = builder.validateObjectAgainstSchema(object);
            errors.push(...(foundErrors || []));
        }
        return errors;
    }

    validateUpdateObjectAgainstSchema(updateObj: UpdateBody<any>): string[] {
        const errors: string[] = [];
        for (const builder of this.schemaBuilders) {
            const foundErrors = builder.validateUpdateObjectAgainstSchema(updateObj);
            errors.push(...(foundErrors || []));
        }
        return errors;
    }

    convertObjectFromSchema(dynamoBaseObject: any): any {
        const trimmed = (this.props.trimColumnsInGet) ? trimRegex(dynamoBaseObject, this.props.trimColumnsInGet) : dynamoBaseObject;
        let returnObj = { ...trimmed };
        for (const builder of this.schemaBuilders) {
            returnObj = builder.convertObjectFromSchema(returnObj);
        }
        return returnObj;
    }

    convertObjectToSchema(baseObject: any): any {
        const trimmed = (this.props.trimUnknown) ? trimUnknown(baseObject, this.knownKeys) : baseObject;
        let returnObj = { ...trimmed };
        for (const builder of this.schemaBuilders) {
            returnObj = builder.convertObjectToSchema(returnObj);
        }
        return returnObj;
    }

    convertObjectFromJavascript(baseObject: any): any {
        const trimmed = (this.props.trimUnknown) ? trimUnknown(baseObject, this.knownKeys) : baseObject;
        let returnObj = { ...trimmed };
        for (const builder of this.schemaBuilders) {
            returnObj = builder.convertObjectFromJavascript(returnObj);
        }
        return returnObj;
    }

    convertObjectToJavascript(baseObject: any): any {
        const trimmed = (this.props.trimUnknown) ? trimUnknown(baseObject, this.knownKeys) : baseObject;
        let returnObj = { ...trimmed };
        for (const builder of this.schemaBuilders) {
            returnObj = builder.convertObjectToJavascript(returnObj);
        }
        return returnObj;
    }

    convertUpdateObjectToSchema(baseObject: UpdateBody<any>): UpdateBody<any> {
        let returnObj = { ...baseObject };
        if (this.props.trimUnknown) {
            if (returnObj.set) {
                returnObj.set = trimUnknown<any, any>(returnObj.set, this.knownKeys);
            }
            if (returnObj.append) {
                returnObj.append = trimUnknown<any, any>(returnObj.append, this.knownKeys);
            }
        }
        if (this.props.trimConstants) {
            if (returnObj.set) {
                returnObj.set = trimConstant<any>(returnObj.set, this.constantKeys);
            }
            if (returnObj.append) {
                returnObj.append = trimConstant<any>(returnObj.append, this.constantKeys);
            }
        }
        for (const builder of this.schemaBuilders) {
            returnObj = builder.convertUpdateObjectToSchema(returnObj);
        }
        return returnObj;
    }
}

function trimUnknown<T extends object, Additions extends object>(originalObj: T & Additions, knownKeys: (StringKeys<T>)[]): T {
    const obj: Partial<T> = {};
    const objKeys: (StringKeys<T>)[] = Object.keys(originalObj || {}) as (StringKeys<T>)[];
    for (const key of objKeys) {
        const keyToInspect = key.match(/^([^[\]]+)(\[[0-9]+\])?.*$/)[1].split(".")[0] as StringKeys<T>;
        if (knownKeys.indexOf(keyToInspect) >= 0) {
            obj[key] = originalObj[key];
        }
    }
    return obj as T;
}

function trimConstant<T extends object>(originalObj: T, constantKeys: (StringKeys<T>)[]): Partial<T> {
    const obj: Partial<T> = { ...originalObj };
    for (const constantKey of constantKeys) {
        delete obj[constantKey];
    }
    return obj;
}

function trimRegex<T extends object, Additions extends object>(originalObj: T & Additions, regex: RegExp | RegExp[]): Partial<T> {
    const obj: T = { ...originalObj };
    const regexToUse: RegExp[] = [].concat(regex);
    const keysOfObjToRemove = Object.keys(obj)
        .filter((k) => {
            for (const regex of regexToUse) {
                if (regex.test(k)) {
                    return true;
                }
            }
        }) as (StringKeys<T>)[];

    for (const key of keysOfObjToRemove) {
        delete obj[key];
    }
    return obj;
}