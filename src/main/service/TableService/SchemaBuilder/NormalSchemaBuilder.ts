import { Converter, NormalSchema, Processor } from "../../KeySchema";
import { UpdateBody } from "../TableService";
import { SchemaBuilder } from "./SchemaBuilder";

export { NormalSchema };

export const UNKNOWN = "__unknown";

// tslint:disable:no-null-keyword Used all over for null checks.
export class NormalSchemaBuilder<T extends NormalSchema = NormalSchema> implements SchemaBuilder {
    readonly key: string;
    readonly schema: T;
    readonly valueType: string;

    private readonly processors: Converter<any, any>[];

    constructor(key: string, schema: T, valueType: string = UNKNOWN) {
        this.key = key;
        this.schema = schema;
        this.valueType = valueType;

        this.processors = [].concat(this.schema.process || []).map(convertToProcessor);
    }

    protected addProcessor(...processor: (Processor<any> | Converter<any, any>)[]) {
        const allConverter = processor.map(convertToProcessor);
        this.processors.push(...allConverter);
    }

    validateObjectAgainstSchema(obj: any): string[] {
        return []
    }

    validateUpdateObjectAgainstSchema(updateBody: UpdateBody<any>): string[] {
        const { set, remove, append } = updateBody;
        const errors: string[] = [];
        if (this.schema.constant || this.schema.primary || this.schema.sort) {
            if ((set && set[this.key] != null )|| // If it's in set
                (append && append[this.key] != null) || // In append
                (remove && remove.indexOf(this.key) >= 0)) { // or in remove
                    // Then we don't it changing.
                    errors.push(`Key "${this.key}" is constant and can not be modified.`);
            }
        }

        if (this.schema.required) {
            if ((set && set[this.key] == null) || // If it's being set to null
                (remove && remove.indexOf(this.key) >= 0)) { // or being removed
                errors.push(`Key "${this.key}" is required but it is being removed.`);
            }
        }

        if (this.valueType !== UNKNOWN) {
            if (set && set[this.key] && typeof set[this.key] !== this.valueType) {
                errors.push(`Key "${this.key}" is expected to be of type ${this.valueType} but got ${typeof set[this.key]}.`);
            }
        }

        return errors;
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
        const { set } = baseObject;
        let newSet = set;
        if (set) {
            newSet = this.convertObjectToSchema(set);
        }
        return {
            ...baseObject,
            set: newSet
        }
    }
}

function convertToProcessor(processorOrConverter: Processor<any> | Converter<any, any>): Converter<any, any> {
    if (typeof processorOrConverter === "function") {
        console.log("CONVERING TO CONVERTER");
        return {
            toObj: processorOrConverter
        }
    } else {
        return processorOrConverter;
    }
}

export default NormalSchemaBuilder;
