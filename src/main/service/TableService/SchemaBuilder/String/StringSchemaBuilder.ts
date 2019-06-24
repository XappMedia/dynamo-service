import * as runes from "runes";
import { CharMap, DynamoStringSchema, Processor, SlugifyParams } from "../../../KeySchema";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";
import { Validator } from "../Normal/Validator";

const slugify = require("slugify");

export { DynamoStringSchema };

export class StringSchemaBuilder extends NormalSchemaBuilder<DynamoStringSchema> {
    constructor(key: string, schema: DynamoStringSchema) {
        super(key, schema, "string");
        console.log("STRING BUILDER", key, schema);
        if (schema.slugify) {
            this.addProcessor(generateSlugifyProcessor(this.schema.slugify));
        }

        if (schema.enum) {
            this.addPutValidator(enumValidator());
            this.addUpdateBodyValidator((key, schema, item) => enumValidator()(key, schema, (item.set) ? item.set[key] : undefined));
        }

        if (schema.invalidCharacters) {
            console.log("SCHEMA HA INVLAI");
            this.addPutValidator(invalidCharacterPutValidator());
            this.addUpdateBodyValidator((key, schema, item) => invalidCharacterPutValidator()(key, schema, (item.set) ? item.set[key] : undefined));
        }

        if (schema.format) {
            this.addPutValidator(formatValidator());
            this.addUpdateBodyValidator((key, schema, item) => formatValidator()(key, schema, (item.set) ? item.set[key] : undefined));
        }
    }
}

export default StringSchemaBuilder;

function invalidCharacterPutValidator(): Validator<any, DynamoStringSchema> {
    return (key, schema, item) => {
        const { invalidCharacters } = schema;
        console.log("LOOINGAINEW", invalidCharacters, item);
        if (item) {
            const invalidateCharacterRegex = new RegExp(`[${invalidCharacters}]`);
            if (invalidateCharacterRegex.test(item)) {
                console.log("AN ERROR OMG");
                return `Key "${key}" contains invalid characters "${invalidCharacters}".`;
            }
        }
    };
}

function formatValidator(): Validator<any, DynamoStringSchema> {
    return (key, schema, item) => {
        const { format } = schema;
        if (!!item && !format.test(item)) {
            return `Key "${key}" does not match the required format "${format}".`;
        }
    };
}

function enumValidator(): Validator<any, DynamoStringSchema> {
    return (key, schema, item) => {
        const allowedEnum = schema.enum;
        if (item) {
            const enumRegex = new RegExp(`^(${allowedEnum.join("|")})$`);
            if (!enumRegex.test(item)) {
                return `Key "${key}" is not one of the values "${allowedEnum.join(", ")}".`;
            }
        }
    };
}

function generateSlugifyProcessor(params: boolean | SlugifyParams): Processor<string> {
    return (value: string) => {
        if (typeof params === "boolean") {
            return slugify(value);
        } else if (typeof params === "object") {
            const { charMap, ...slugParams } = params;
            // If the user overrides the "remove", then the slugify util will leave
            // in a bunch of characters that we don't want.
            // So to be fully solid, we'll do two passes.  One with the removes, and one without.
            return slugify(slugify(replaceChars(value, charMap), slugParams).trim());
        }
    };
}


function replaceChars(stringValue: string, charMap: CharMap): string {
    if (!charMap) {
        return stringValue;
    }

    // tslint:disable:no-null-keyword checking for null and undefined.
    return runes(stringValue).reduce((replacement, ch) => replacement + (charMap[ch] || ch), "");
    // tslint:enable:no-null-keyword
}