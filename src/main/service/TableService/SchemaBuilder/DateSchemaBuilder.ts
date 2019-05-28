import { DateFormat, DateSchema } from "../../KeySchema";
import NormalSchemaBuilder from "./NormalSchemaBuilder";

export { DateSchema };

export class DateSchemaBuilder extends NormalSchemaBuilder<DateSchema> {
    constructor(key: string, schema: DateSchema) {
        super(key, schema, isIsoDateFormat(schema.dateFormat) ? "string" : "number");
    }
}

function isIsoDateFormat(format?: DateFormat): format is "ISO-8601" {
    return !!format && format === "ISO-8601";
}

export default DateSchemaBuilder;