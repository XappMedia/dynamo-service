import { throwIfDoesContain, throwIfDoesNotContain } from "../../utils/Object";
import { Set, UpdateBody } from "../DynamoService";
import { isDynamoStringSchema, isMapMapAttribute, isMapSchema, isStringMapAttribute, MapSchema, TableSchema } from "../KeySchema";
import { ValidationError } from "../ValidationError";

type BannedKeys<T> = Partial<Record<keyof T, RegExp>>;
type FormattedKeys<T> = Partial<Record<keyof T, RegExp>>;
type EnumKeys<T> = Partial<Record<keyof T, string[]>>;
type MapSchemas<T> = Partial<Record<keyof T, MapSchema>>;

interface ParsedElements<T> {
    readonly requiredKeys: (keyof T)[];
    readonly constantKeys: (keyof T)[];
    readonly knownKeys: (keyof T)[];

    readonly bannedKeys: BannedKeys<T>;
    readonly formattedKeys: FormattedKeys<T> ;
    readonly enumKeys: EnumKeys<T>;
    readonly mapSchemas: MapSchemas<T>;
}

class TableSchemaParser<T extends object> implements ParsedElements<T> {
    readonly primaryKeys: (keyof T)[] = [];
    readonly sortKeys: (keyof T)[] = [];
    readonly requiredKeys: (keyof T)[] = [];
    readonly constantKeys: (keyof T)[] = [];
    readonly knownKeys: (keyof T)[] = [];

    readonly bannedKeys: BannedKeys<T> = {};
    readonly formattedKeys: FormattedKeys<T> = {};
    readonly enumKeys: EnumKeys<T> = {};
    readonly mapSchemas: MapSchemas<T> = {};

    constructor(tableSchema: TableSchema<T>) {
        for (let key in tableSchema) {
            const v = tableSchema[key];

            this.knownKeys.push(key as keyof T);

            if (v.primary) {
                this.primaryKeys.push(key as keyof T);
                this.constantKeys.push(key as keyof T);
                this.requiredKeys.push(key as keyof T);
            }
            if (v.sort) {
                this.sortKeys.push(key as keyof T);
                this.constantKeys.push(key as keyof T);
                this.requiredKeys.push(key as keyof T);
            }
            if (v.required) {
                this.requiredKeys.push(key as keyof T);
            }
            if (v.constant) {
                this.constantKeys.push(key as keyof T);
            }

            if (isDynamoStringSchema(v)) {
                if (v.invalidCharacters) {
                    this.bannedKeys[key as keyof T] = new RegExp("[" + v.invalidCharacters + "]");
                }
                if (v.enum) {
                    this.enumKeys[key as keyof T] = v.enum;
                }
                if (v.format) {
                    this.formattedKeys[key as keyof T] = v.format;
                }
            }

            if (isMapSchema(v)) {
                this.mapSchemas[key as keyof T] = v;
            }
        }
    }
}

class MapSchemaParser implements ParsedElements<any> {
    readonly constantKeys: string[] = [];
    readonly knownKeys: string[] = [];
    readonly requiredKeys: string[] = [];
    readonly mapSchemas: MapSchemas<any> = {};
    readonly bannedKeys: BannedKeys<any> = {};
    readonly formattedKeys: FormattedKeys<any> = {};
    readonly enumKeys: EnumKeys<any> = {};

    constructor(schema: MapSchema) {
        this.knownKeys = Object.keys(schema.attributes || []);
        for (const attrib of this.knownKeys) {
            const mapItem = schema.attributes[attrib];
            if (mapItem.required) {
                this.requiredKeys.push(attrib);
            }

            if (isStringMapAttribute(mapItem)) {
                if (mapItem.format) {
                    this.formattedKeys[attrib] = mapItem.format;
                }
                if (mapItem.invalidCharacters) {
                    this.bannedKeys[attrib] = new RegExp("[" + mapItem.invalidCharacters + "]");
                }
                if (mapItem.enum) {
                    this.enumKeys[attrib] = mapItem.enum;
                }
            }

            if (isMapMapAttribute(mapItem)) {
                this.mapSchemas[attrib] = mapItem;
            }
        }
    }
}

export class TableSchemaValidator<T extends object> {
    private readonly parsedSchema: TableSchemaParser<T>;

    constructor (tableSchema: TableSchema<T>, tableName: string) {
        this.parsedSchema = new TableSchemaParser(tableSchema);
        if (this.parsedSchema.primaryKeys.length === 0) {
            throw new ValidationError("Table " + tableName + " must include a primary key.");
        }
        if (this.parsedSchema.primaryKeys.length > 1) {
            throw new ValidationError("Table " + tableName + " must only have one primary key.");
        }
        if (this.parsedSchema.sortKeys.length > 1) {
            throw new ValidationError("Table " + tableName + " can not have more than one sort key.");
        }
    }

    validate(obj: T): T {
        validateObject(this.parsedSchema, obj);
        return obj;
    }

    validateUpdateObj(updateObj: UpdateBody<T>): UpdateBody<T> {
        validateUpdateObject(this.parsedSchema, updateObj);
        return updateObj;
    }
}

interface ValidateObjectProps {
    extrasAllowed?: boolean;
}

function validateObject<T extends object>(parser: ParsedElements<T>, obj: T, props: ValidateObjectProps = {}) {
    const { extrasAllowed } = props;
    ensureHasRequiredKeys(parser.requiredKeys, obj);
    ensureNoInvalidCharacters(parser.bannedKeys, obj);
    ensureEnums(parser.enumKeys, obj);
    ensureFormat(parser.formattedKeys, obj);
    if (!extrasAllowed) {
        ensureNoExtraKeys(parser.knownKeys, obj);
    }
    validateKnownMaps(parser.mapSchemas, obj);
}

function validateUpdateObject<T extends object>(parser: ParsedElements<T>, updateObj: UpdateBody<T>) {
    const { set, append, remove } = updateObj;
    ensureDoesNotHaveConstantKeys(parser.constantKeys.concat(parser.requiredKeys), remove);
    ensureDoesNotHaveConstantKeys(parser.constantKeys, append);
    ensureDoesNotHaveConstantKeys(parser.constantKeys, set);
    ensureNoInvalidCharacters<Set<T>>(parser.bannedKeys, set);
    ensureEnums<Set<T>>(parser.enumKeys, set);
    ensureFormat<Set<T>>(parser.formattedKeys, set);
    ensureNoExtraKeys<Set<T>>(parser.knownKeys, set);
    validateKnownMaps<Set<T>>(parser.mapSchemas, set);
}

function validateKnownMaps<T>(mapSchemas: MapSchemas<T>, obj: T) {
    for (const mapKey in mapSchemas) {
        if (obj[mapKey]) {
            const mapSchema = mapSchemas[mapKey];
            const mapSchemaParser = new MapSchemaParser(mapSchema);
            // Attributes which aren't defined in map schema parser is open for interpretation
            const extrasAllowed = mapSchema.onlyAllowDefinedAttributes && mapSchemaParser.knownKeys.length === 0;
            validateObject<any>(mapSchemaParser, obj[mapKey], { extrasAllowed });
        }
    }
}

function ensureDoesNotHaveConstantKeys<T>(constantKeys: (keyof T)[], obj: Partial<T> | (keyof T)[]) {
    throwIfDoesContain(obj as any, constantKeys, (foundKeys) => {
        throw new ValidationError("The keys '" + foundKeys.join(", ") + "' are constant and can not be modified.");
    });
}

function ensureHasRequiredKeys<T>(requiredKeys: (keyof T)[], obj: T) {
    throwIfDoesNotContain(obj, requiredKeys, false, (missingKeys) => {
        throw new ValidationError("The the object requires the keys '" + missingKeys.join(", ") + "'.");
    });
}

function ensureNoExtraKeys<T>(knownKeys: (keyof T)[], obj: T) {
    if (obj) {
        for (const key of Object.keys(obj)) {
            if (knownKeys.indexOf(key as keyof T) < 0) {
                throw new ValidationError("Key '" + key + "' is not defined in the table.");
            }
        }
    }
}

function ensureNoInvalidCharacters<T extends object>(bannedKeys: BannedKeys<T>, obj: T) {
    if (obj) {
        for (let key in bannedKeys) {
            const value = obj[key];
            if (typeof value === "string") {
                if (bannedKeys[key].test(value)) {
                    throw new ValidationError("Invalid character found in key '" + value + "'.");
                }
            }// Else could be undefined.  It's not our job to judge here.
        }
    }
}

function ensureEnums<T extends object>(keysWithEnums: EnumKeys<T>, obj: T) {
    if (obj) {
        for (let key in keysWithEnums) {
            const value = obj[key];
            if (typeof value === "string") {
                if (keysWithEnums[key].indexOf(value) < 0) {
                    throw new ValidationError("Invalid enum value '" + value + "' for key '" + key + "'.");
                }
            }
        }
    }
}

function ensureFormat<T extends object>(format: FormattedKeys<T>, obj: T) {
    if (obj) {
        for (let key in format) {
            const value = obj[key];
            if (typeof value === "string") {
                if (!format[key].test(value)) {
                    throw new ValidationError("Invalid format '" + value + "' for key '" + key + "'.");
                }
            }
        }
    }
}