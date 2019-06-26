import { Converter, DateFormat, DateSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";
import { isDateObjUpdateBodyValidator, isDateObjValidator } from "./DateSchemaValidator";

export { DateSchema };

export class DateSchemaBuilder extends NormalSchemaBuilder<DateSchema> {
    constructor(key: string, schema: DateSchema) {
        super(key, schema, isTimestampFormat(schema.dateFormat) ? "number" : "string");

        this.addProcessor(generateFormatProcessor(schema.dateFormat));

        this.addPutValidator(isDateObjValidator());
        this.addUpdateBodyValidator(isDateObjUpdateBodyValidator());
    }
}

function isTimestampFormat(format?: DateFormat): format is "Timestamp" {
    return !!format && format === "Timestamp";
}

function generateFormatProcessor(): Converter<Date, string>;
function generateFormatProcessor(format: "ISO-8601"): Converter<Date, string>;
function generateFormatProcessor(format: "Timestamp"): Converter<Date, number>;
function generateFormatProcessor(format: DateFormat): Converter<Date, string> | Converter<Date, number>;
function generateFormatProcessor(format?: DateFormat): Converter<Date, string> | Converter<Date, number> {
    if (format === "Timestamp") {
        return {
            toObj: (item) => (item) ? new Date(item).getTime() : undefined,
            fromObj: (item: number) => (item) ? new Date(item) : undefined
        };
    }
    return {
        toObj: (item) => (item) ? new Date(item).toISOString() : undefined,
        fromObj: (item: string) => (item) ? new Date(item) : undefined
    };
}

export default DateSchemaBuilder;