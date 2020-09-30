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

import { DynamoListSchema } from "../../../KeySchema";
import MapSchemaBuilder from "../Map/MapSchemaBuilder";
import NormalSchemaBuilder, { UpdateBody } from "../Normal/NormalSchemaBuilder";

export { DynamoListSchema };

const MAP_KEY = "mapObj";

export class ListSchemaBuilder extends NormalSchemaBuilder<DynamoListSchema> {
    private readonly mapBuilder: MapSchemaBuilder;

    constructor(key: string, schema: DynamoListSchema) {
        super(key, schema, "object");

        if (schema.mapAttributes) {
            this.mapBuilder = new MapSchemaBuilder(MAP_KEY, { type: "M", attributes: schema.mapAttributes });
        }
    }

    convertObjectToSchema(obj: any) {
        const returnObj = super.convertObjectToSchema(obj);
        const itemToConvert = returnObj[this.key];
        if (Array.isArray(itemToConvert) && this.mapBuilder) {
            for (let i = 0; i < itemToConvert.length; ++i) {
                const convertedItem = this.mapBuilder.convertObjectToSchema({ [MAP_KEY]: itemToConvert[i] });
                itemToConvert[i] = convertedItem[MAP_KEY];
            }
        }
        return returnObj;
    }

    convertObjectFromSchema(obj: any) {
        const returnObj = super.convertObjectFromSchema(obj);
        const itemToConvert = returnObj[this.key];
        if (Array.isArray(itemToConvert) && this.mapBuilder) {
            for (let i = 0; i < itemToConvert.length; ++i) {
                const convertedItem = this.mapBuilder.convertObjectFromSchema({ [MAP_KEY]: itemToConvert[i] });
                itemToConvert[i] = convertedItem[MAP_KEY];
            }
        }
        return returnObj;
    }

    convertUpdateObjectToSchema(obj: UpdateBody<any>) {
        const returnObj = super.convertUpdateObjectToSchema(obj);
        const { set = {}, append = {}, prepend = {}} = returnObj;
        if (Array.isArray(set[this.key])) {
            const itemToConvert = set[this.key];
            for (let i = 0; i < itemToConvert.length; ++i) {
                const convertedItem = this.mapBuilder.convertUpdateObjectToSchema({ set: { [MAP_KEY]: itemToConvert[i] }});
                itemToConvert[i] = convertedItem.set[MAP_KEY];
            }
        }
        if (Array.isArray(append[this.key])) {
            const itemToConvert = append[this.key];
            for (let i = 0; i < itemToConvert.length; ++i) {
                const convertedItem = this.mapBuilder.convertUpdateObjectToSchema({ set: { [MAP_KEY]: itemToConvert[i] }});
                itemToConvert[i] = convertedItem.set[MAP_KEY];
            }
        }
        if (Array.isArray(prepend[this.key])) {
            const itemToConvert = prepend[this.key];
            for (let i = 0; i < itemToConvert.length; ++i) {
                const convertedItem = this.mapBuilder.convertUpdateObjectToSchema({ set: { [MAP_KEY]: itemToConvert[i] }});
                itemToConvert[i] = convertedItem.set[MAP_KEY];
            }
        }
        // The set, append, and prepend were changed directly so don't re-insert. If they didn't exist previously, then they won't exist now.
        return { ...returnObj };
    }

    validateObjectAgainstSchema(obj: any) {
        const errors: string[] = super.validateObjectAgainstSchema(obj);
        const itemToConvert = obj[this.key];
        if (Array.isArray(itemToConvert) && this.mapBuilder) {
            for (let i = 0; i < itemToConvert.length; ++i) {
                const foundErrors = this.mapBuilder.validateObjectAgainstSchema({ [MAP_KEY]: itemToConvert[i] });
                errors.push(...foundErrors);
            }
        }
        return errors;
    }

    validateUpdateObjectAgainstSchema(obj: UpdateBody<any>) {
        const errors: string[] = super.validateUpdateObjectAgainstSchema(obj);
        if (!this.mapBuilder) {
            return errors;
        }
        const { set = {}, append = {}, prepend = {}} = obj;
        const itemsToValidate: any[] =
            (Array.isArray(set[this.key]) ? set[this.key] : [])
            .concat(Array.isArray(append[this.key]) ? append[this.key] : [])
            .concat(Array.isArray(prepend[this.key]) ? prepend[this.key] : []);
        for (let i = 0; i < itemsToValidate.length; ++i) {
            const foundErrors = this.mapBuilder.validateUpdateObjectAgainstSchema({ set: { [MAP_KEY]: itemsToValidate[i] }});
            errors.push(...foundErrors);
        }
        return errors;
    }
}

export default ListSchemaBuilder;