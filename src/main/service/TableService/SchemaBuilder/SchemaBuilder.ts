import { isDateSchema, isDynamoStringSchema, KeySchema } from "../../KeySchema";
import { UpdateBody } from "../TableService";
import DateSchemaBuilder from "./DateSchemaBuilder";
import NormalSchemaBuilder from "./NormalSchemaBuilder";
import StringSchemaBuilder from "./StringSchemaBuilder";

export interface SchemaBuilder {
    validateObjectAgainstSchema(object: any): string[];
    validateUpdateObjectAgainstSchema(updateObj: UpdateBody<any>): string[];
    convertObjectToSchema(baseObject: any): any;
    convertObjectFromSchema(dynamoBaseObject: any): any;
    convertUpdateObjectToSchema(baseObject: UpdateBody<any>): UpdateBody<any>;
}

export function getSchemaBuilder(key: string, schema: KeySchema) {
    if (isDynamoStringSchema(schema)) {
        return new StringSchemaBuilder(key, schema);
    }
    if (isDateSchema(schema)) {
        return new DateSchemaBuilder(key, schema);
    }
    return new NormalSchemaBuilder(key, schema);
}