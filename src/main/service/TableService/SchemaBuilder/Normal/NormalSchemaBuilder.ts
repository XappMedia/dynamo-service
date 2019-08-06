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
import { Converter, NormalSchema, Processor } from "../../../KeySchema";
import { SchemaBuilder } from "../SchemaBuilder";
import { isConstantUpdateBodyValidator } from "./IsConstantValidator";
import { isCorrectValueTypeUpdateBodyValidator, isCorrectValueTypeValidator } from "./IsCorrectValueTypeValidator";
import { isRequiredPutObjectValidator, isRequiredUpdateBodyValidator } from "./IsRequiredValidator";
import { Validator } from "./Validator";

export { NormalSchema, UpdateBody };

export const UNKNOWN = "__unknown";

// tslint:disable:no-null-keyword Used all over for null checks.
export class NormalSchemaBuilder<T extends NormalSchema = NormalSchema> implements SchemaBuilder {
    readonly key: string;
    readonly schema: T;
    readonly valueType: string;

    private readonly validators: Validator<any>[];
    private readonly updateValidators: Validator<UpdateBody<any>>[]
    private readonly processors: Converter<any, any>[];
    private readonly javascriptProcessors: Converter<any, any>[];

    constructor(key: string, schema: T, valueType: string = UNKNOWN) {
        this.key = key;
        this.schema = schema;
        this.valueType = valueType;

        this.processors = [].concat(this.schema.process || []).map(convertToProcessor);
        this.javascriptProcessors = [];

        this.validators = [
            isRequiredPutObjectValidator()
        ]
        this.updateValidators = [
            isConstantUpdateBodyValidator(),
            isRequiredUpdateBodyValidator()
        ]
        if (valueType !== UNKNOWN) {
            this.validators.push(isCorrectValueTypeValidator(valueType));
            this.updateValidators.push(isCorrectValueTypeUpdateBodyValidator(valueType));
        }
    }

    /**
     * Adds a processor which will process the item each time the item
     * is inserted or retrieved from the database.
     *
     * Processors that are just functions or only have a "to" function
     * will only process items going in to the database. They are ignored
     * coming back.  This can be used for example string objects which
     * need to be lower-cased before inserting.
     *
     * Processors that are Converters which both a "to" and "from" function
     * will convert the item to the item and convert it back when retrieved.
     * This can be useful for objects that can't be stored in a Dynamo datbase
     * like Date.  Convert the Date object to a string or number in the "to",
     * then convert it back to a Date in the "from".
     *
     * All processors can get an "undefined" object value. This allows the
     * processor to return a default value if one should be inserted.
     * Processors should be able to handle an "undefined" value. It should
     * return an "undefined" value if there is no default. In which case,
     * the column will not be inserted in to the database.
     *
     * @param {(...(Processor<any> | Converter<any, any>)[])} processor
     * @memberof NormalSchemaBuilder
     */
    addProcessor(...processor: (Processor<any> | Converter<any, any>)[]) {
        const allConverter = processor.map(convertToProcessor);
        this.processors.push(...allConverter);
    }

    /**
     *  A converter that must be run in order to make the object writeable
     * to DynamoDB.  The "to" will convert the Javascript object to something
     * that DynamoDB can read.  The "from" will convert it back.
     *
     * This is separate from normal processors in that these are absolutely
     * required to execute before inserting.  This is helpful when
     * generated Key objects when querying or Getting an item. If an item already
     * exists in the database, then you generally don't want to run processors
     * on it because it may have been created before the processor was added.
     * Create a converter that converts the object "as-is" to the database-equivalent.
     * Then convert the object back to the Javascript equivalent.
     * Run the "convertFromJavascript" before inserting it and it will
     * bypass all other processors and only run these.
     *
     * @protected
     * @param {...Converter<any, any>[]} processor
     * @memberof NormalSchemaBuilder
     */
    addJavascriptProcessor(...processor: Converter<any, any>[]) {
        this.javascriptProcessors.push(...processor);
    }

    /**
     * Validator for inserting a full object in to the database.
     *
     * All validators can get an "undefined" value with it and
     * should be able to handle it.
     *
     * All validators will collect the errors that are wrong with
     * the inserted item. If any errors are detected, the
     * item should not be included.
     *
     * @param {...Validator<any>[]} validators
     * @memberof NormalSchemaBuilder
     */
    addPutValidator(...validators: Validator<any>[]) {
        this.validators.push(...validators);
    }

    /**
     * Validator for inserting an Update object in to the database.
     * These objects may contain a "set", "append", or "remove"
     * attribute which need to be inspected before inserting.
     * All validators will collect the errors that are wrong with
     * the inserted item. If any errors are detected, the
     * item should not be included.
     *
     * @param {...Validator<any>[]} validators
     * @memberof NormalSchemaBuilder
     */
    addUpdateBodyValidator(...validators: Validator<UpdateBody<any>, T>[]) {
        this.updateValidators.push(...validators);
    }

    /**
     * Validates a full object that's about to be inserted
     * in to the database. No conversions take place, so
     * make sure the item is already converted before validating.
     *
     * @param {*} obj
     * @returns {string[]}
     * @memberof NormalSchemaBuilder
     */
    validateObjectAgainstSchema(obj: any): string[] {
        return this.runValidators(this.validators, obj[this.key]);
    }

    /**
     * Validates the attributes in an UpdateBody.
     * No conversions take place, so make sure the item is
     * already converted before validating.
     *
     * @param {UpdateBody<any>} updateBody
     * @returns {string[]}
     * @memberof NormalSchemaBuilder
     */
    validateUpdateObjectAgainstSchema(updateBody: UpdateBody<any>): string[] {
        return this.runValidators(this.updateValidators, updateBody);
    }

    /**
     * Runs the processors through the object until it fits the
     * schema.
     *
     * @param {*} baseObject
     * @returns {*}
     * @memberof NormalSchemaBuilder
     */
    convertObjectToSchema(baseObject: any): any {
        const hasProperty = baseObject.hasOwnProperty(this.key);
        const original = baseObject[this.key];
        let current: any = original;
        for (const processor of this.processors) {
            current = processor.toObj(current);
        }
        if (!hasProperty && current == null) {
            // If it did not originally have the property AND the processors did not add any default values,
            // just return the original value.
            return baseObject;
        }
        return this.convertObjectFromJavascript({ ...baseObject, [this.key]: current });
    }

    /**
     * Runs the processors through the UpdateBody object
     * until all attributes fit the schema.
     *
     * @param {UpdateBody<any>} baseObject
     * @returns {UpdateBody<any>}
     * @memberof NormalSchemaBuilder
     */
    convertUpdateObjectToSchema(baseObject: UpdateBody<any>): UpdateBody<any> {
        const copy = { ...baseObject };
        // If the user's not setting the property then we don't want to set it for them.
        if (copy.set && copy.set.hasOwnProperty(this.key)) {
            copy.set = this.convertObjectToSchema(copy.set);
        }
        return copy;
    }

    /**
     * Runs the FROM processors through the object until
     * it is converted back from the database.
     *
     * @param {*} dynamoBaseObject
     * @returns {*}
     * @memberof NormalSchemaBuilder
     */
    convertObjectFromSchema(dynamoBaseObject: any): any {
        if (!dynamoBaseObject.hasOwnProperty(this.key)) {
            return dynamoBaseObject;
        }

        const copy = { ...dynamoBaseObject };
        for (const processor of this.processors) {
            copy[this.key] = (processor.fromObj) ? processor.fromObj(copy[this.key]) : copy[this.key];
        }
        return this.convertObjectToJavascript(copy);
    }

    /**
     * Only runs the converters that converts the object from
     * its Javascript representation in to it's DynamoDB representation.
     *
     * @param {*} baseObject
     * @returns {*}
     * @memberof NormalSchemaBuilder
     */
    convertObjectFromJavascript(baseObject: any): any {
        const hasProperty = baseObject.hasOwnProperty(this.key);
        const original = baseObject[this.key];
        let current: any = original;
        for (const processor of this.javascriptProcessors) {
            current = processor.toObj(current);
        }
        if (!hasProperty && current == null) {
            // If it did not originally have the property AND the processors did not add any default values,
            // just return the original value.
            return baseObject;
        }
        return { ...baseObject, [this.key]: current };
    }

    /**
     * Only runs the converters that converts the object
     * from its DynamoDB representation to its Javascript representation.
     *
     * @param {*} dynamoBaseObject
     * @returns {*}
     * @memberof NormalSchemaBuilder
     */
    convertObjectToJavascript(dynamoBaseObject: any): any {
        if (!dynamoBaseObject.hasOwnProperty(this.key)) {
            return dynamoBaseObject;
        }

        const copy = { ...dynamoBaseObject };
        for (const processor of this.javascriptProcessors) {
            copy[this.key] = processor.fromObj(copy[this.key]);
        }
        return copy;
    }

    private runValidators(validators: Validator<any>[], obj: any) {
        const errors: string[] = [];
        for (const validator of validators) {
            const foundErrors = validator(this.key, this.schema, obj);
            if (foundErrors && foundErrors.length > 0) {
                if (Array.isArray(foundErrors)) {
                    errors.push(...foundErrors);
                } else {
                    errors.push(foundErrors);
                }
            }
        }
        return errors;
    }
}

function convertToProcessor(processorOrConverter: Processor<any> | Converter<any, any>): Converter<any, any> {
    return (typeof processorOrConverter === "function") ? { toObj: processorOrConverter } : processorOrConverter;
}

export default NormalSchemaBuilder;
