import * as runes from "runes";
import { CharMap, DynamoStringSchema, Processor, SlugifyParams } from "../../../KeySchema";
import { UpdateBody } from "../../TableService";
import NormalSchemaBuilder from "../Normal/NormalSchemaBuilder";

const slugify = require("slugify");

export { DynamoStringSchema };

export class StringSchemaBuilder extends NormalSchemaBuilder<DynamoStringSchema> {
    private readonly format: RegExp;
    private readonly invalidateCharacterRegex: RegExp;
    private readonly enums: RegExp;

    constructor(key: string, schema: DynamoStringSchema) {
        super(key, schema, "string");
        this.invalidateCharacterRegex = (schema.invalidCharacters) ? new RegExp(`[${this.schema.invalidCharacters}]`) : undefined;
        this.format = (schema.format) ? new RegExp(`^${schema.format.source}$`) : undefined;
        this.enums = (schema.enum) ? new RegExp(`^(${schema.enum.join("|")})$`) : undefined;

        if (schema.slugify) {
            this.addProcessor(generateSlugifyProcessor(this.schema.slugify));
        }
    }

    validateUpdateObjectAgainstSchema(updateBody: UpdateBody<any>): string[] {
        const errors = super.validateUpdateObjectAgainstSchema(updateBody);
        const { set } = updateBody;
        const setValue: string = set && set[this.key];
        if (setValue && typeof setValue === "string") {
            if (this.invalidateCharacterRegex && this.invalidateCharacterRegex.test(setValue)) {
                errors.push(`Key "${this.key}" contains invalid characters "${this.schema.invalidCharacters}".`);
            }
            if (this.format && !this.format.test(setValue)) {
                errors.push(`Key "${this.key}" does not match the required format "${this.schema.format}".`);
            }
            if (this.enums && !this.enums.test(setValue)) {
                errors.push(`Key "${this.key}" is not one of the values "${this.schema.enum.join(", ")}".`);
            }
        }
        return errors;
    }
}

export default StringSchemaBuilder;

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