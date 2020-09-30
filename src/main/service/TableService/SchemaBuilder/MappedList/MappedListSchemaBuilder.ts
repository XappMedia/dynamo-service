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

import { MappedListSchema } from "../../../KeySchema";
import MapSchemaBuilder from "../Map/MapSchemaBuilder";
import NormalSchemaBuilder, { UpdateBody } from "../Normal/NormalSchemaBuilder";
export { MappedListSchema };

const INDEX_KEY = "__mapListIndex__";

interface MapListItem {
    "__mapListIndex__"?: number;
}

export class MappedListSchemaBuilder extends NormalSchemaBuilder<MappedListSchema> {
    private readonly mapSchemaBuilder: MapSchemaBuilder;

    constructor(key: string, schema: MappedListSchema) {
        super(key, schema, "object");

        this.mapSchemaBuilder = new MapSchemaBuilder("mapKey", {
            ...schema,
            attributes: {
                ...schema.attributes,
                "__mapListIndex": {
                    type: "N"
                }
            },
            type: "M",
        });

        const { keyAttribute } = schema;

        this.addJavascriptProcessor({
            toObj: (arr: any[]) => {
                if (!Array.isArray(arr)) {
                    return arr;
                }
                const returnObj: {[key: string]: object} = {};
                for (let i = 0; i < arr.length; ++i) {
                    const item = arr[i];
                    const keyValue = String((item as any)[keyAttribute]);
                    returnObj[keyValue] = {...item, [INDEX_KEY]: i };
                }
                return returnObj;
            },
            fromObj: (obj: object & MapListItem) => {
                const returnObj: object[] = [];
                const unnumberredReturnObj: object[] = [];
                const keys = Object.keys(obj);
                for (const key of keys) {
                    const item = (obj as any)[key];
                    if (typeof item.__mapListIndex__ === "number") {
                        returnObj[item.__mapListIndex__] = item;
                        delete item.__mapListIndex__;
                    } else {
                        unnumberredReturnObj.push(item);
                    }
                }
                return returnObj.concat(unnumberredReturnObj);
            }
        });
    }

    convertObjectToSchema(arr: object) {
        const returnObj: any = super.convertObjectToSchema(arr);
        if (returnObj && returnObj.hasOwnProperty(this.key) && this.schema.attributes) {
            const objIWantToConvert = returnObj[this.key];
            for (const key of Object.keys(objIWantToConvert)) {
                const convertedObj = this.mapSchemaBuilder.convertObjectToSchema({ mapKey: objIWantToConvert[key] });
                objIWantToConvert[key] = convertedObj.mapKey;
            }
        }
        return returnObj;
    }

    convertUpdateObjectToSchema(obj: UpdateBody<any>) {
        const { keyAttribute } = this.schema;
        const { set = {}, append = {}, prepend = {}, ...remainingObj } = obj;
        const objsToAppend = (append[this.key] || []).concat(prepend[this.key] || []);
        if (objsToAppend.length > 0) {
            for (const obj of objsToAppend) {
                const setKey = `${this.key}.${obj[keyAttribute]}`;
                set[setKey] = this.mapSchemaBuilder.convertObjectToSchema({ mapKey: obj }).mapKey;
            }
        }
        return super.convertUpdateObjectToSchema({ ...remainingObj, set });
    }

    convertObjectFromSchema(baseObj: object) {
        const obj: any = super.convertObjectFromSchema(baseObj);
        const objIWantToConvert: object[] = obj[this.key];
        if (objIWantToConvert) {
            for (let i = 0; i < objIWantToConvert.length; ++i) {
                const convertedObj = this.mapSchemaBuilder.convertObjectFromSchema({ mapKey: objIWantToConvert[i] });
                objIWantToConvert[i] = convertedObj.mapKey;
            }
        }
        return obj;
    }

    validateObjectAgainstSchema(baseObj: any) {
        const errors: string[] = super.validateObjectAgainstSchema(baseObj);
        const itemIWantToValidate = baseObj[this.key];
        if (itemIWantToValidate) {
            const keys = Object.keys(itemIWantToValidate);
            for (const key of keys) {
                const item = itemIWantToValidate[key];
                const foundErrors = this.mapSchemaBuilder.validateObjectAgainstSchema({ mapKey: item });
                errors.push(...foundErrors);
            }
        }
        return errors;
    }

    validateUpdateObjectAgainstSchema(baseObj: UpdateBody<any>) {
        const errors: string[] = super.validateUpdateObjectAgainstSchema(baseObj);
        const { keyAttribute } = this.schema;
        const { set = {} } = baseObj;
        // We put everything in set so append and prepend don't matter
        const setKeys = Object.keys(set);
        // We currently do not support nested attributes that are further than the immediate keys in the schema
        const keysIWantToInspect = setKeys
            .filter(s => s.startsWith(this.key))
            .filter(s => s.split(".").length <= 2);
        for (const keyIWantToInspect of keysIWantToInspect) {
            const setItemsIWantToValidate = set[keyIWantToInspect] || {};
            const objToValidate = keyIWantToInspect === this.key ?
                setItemsIWantToValidate[keyAttribute] :
                setItemsIWantToValidate;
            const foundErrors = this.mapSchemaBuilder.validateObjectAgainstSchema({ mapKey: objToValidate });
            errors.push(...foundErrors);
        }
        return errors;
    }
}

export default MappedListSchemaBuilder;