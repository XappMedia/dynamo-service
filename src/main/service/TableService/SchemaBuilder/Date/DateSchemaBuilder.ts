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
            toObj: (item) => new Date(item).getTime(),
            fromObj: (item: number) => new Date(item)
        };
    }
    return {
        toObj: (item) => new Date(item).toISOString(),
        fromObj: (item: string) => new Date(item)
    };
}

export default DateSchemaBuilder;