import {
    isBooleanSchema,
    isDateSchema,
    isDynamoStringSchema,
    isListSchema,
    isMapSchema,
    isNumberSchema,
    KeySchema} from "../../KeySchema";
import { UpdateBody } from "../TableService";
import BooleanSchemaBuilder from "./Boolean/BooleanSchemaBuilder";
import DateSchemaBuilder from "./Date/DateSchemaBuilder";
import ListSchemaBuilder from "./List/ListSchemaBuilder";
import MapSchemaBuilder from "./Map/MapSchemaBuilder";
import NormalSchemaBuilder from "./Normal/NormalSchemaBuilder";
import NumberSchemaBuilder from "./Number/NumberSchemaBuilder";
import StringSchemaBuilder from "./String/StringSchemaBuilder";

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
    return new NormalSchemaBuilder(key, schema);
}