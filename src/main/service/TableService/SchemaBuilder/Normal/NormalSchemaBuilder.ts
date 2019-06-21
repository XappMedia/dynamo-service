import { Converter, NormalSchema, Processor } from "../../../KeySchema";
import { UpdateBody } from "../../TableService";
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

    constructor(key: string, schema: T, valueType: string = UNKNOWN) {
        this.key = key;
        this.schema = schema;
        this.valueType = valueType;

        this.processors = [].concat(this.schema.process || []).map(convertToProcessor);
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

    protected addProcessor(...processor: (Processor<any> | Converter<any, any>)[]) {
        const allConverter = processor.map(convertToProcessor);
        this.processors.push(...allConverter);
    }

    protected addPutValidator(...validators: Validator<any>[]) {
        this.validators.push(...validators);
    }

    protected addUpdateBodyValidator(...validators: Validator<UpdateBody<any>>[]) {
        this.updateValidators.push(...validators);
    }

    validateObjectAgainstSchema(obj: any): string[] {
        return this.runValidators(this.validators, obj);
    }

    validateUpdateObjectAgainstSchema(updateBody: UpdateBody<any>): string[] {
        return this.runValidators(this.updateValidators, updateBody);
    }

    convertObjectToSchema(baseObject: any): any {
        if (baseObject[this.key] == null) {
            return baseObject;
        }

        const copy = { ...baseObject };
        for (const processor of this.processors) {
            copy[this.key] = processor.toObj(copy[this.key]);
        }

        return copy;
    }

    convertUpdateObjectToSchema(baseObject: UpdateBody<any>): UpdateBody<any> {
        const copy = { ...baseObject };
        if (copy.set) {
            copy.set = this.convertObjectToSchema(copy.set);
        }
        return copy;
    }

    convertObjectFromSchema(dynamoBaseObject: any): any {
        if (dynamoBaseObject[this.key] == null) {
            return dynamoBaseObject;
        }

        const copy = { ...dynamoBaseObject };
        for (const processor of this.processors) {
            copy[this.key] = (processor.fromObj) ? processor.fromObj(copy[this.key]) : copy[this.key];
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
