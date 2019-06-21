import { Converter, DateFormat, DateSchema } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";

export { DateSchema };

export class DateSchemaBuilder extends NormalSchemaBuilder<DateSchema> {
    constructor(key: string, schema: DateSchema) {
        super(key, schema, isIsoDateFormat(schema.dateFormat) ? "string" : "number");

        this.addProcessor(generateFormatProcessor(schema.dateFormat));
    }
}

function isIsoDateFormat(format?: DateFormat): format is "ISO-8601" {
    return !!format && format === "ISO-8601";
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