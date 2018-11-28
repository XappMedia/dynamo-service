import { throwIfDoesContain, throwIfDoesNotContain } from "../../utils/Object";
import { UpdateBody } from "../DynamoService";
import { isDynamoStringSchema, isMapSchema, isStringMapAttribute, MapSchema, TableSchema } from "../KeySchema";
import { ValidationError } from "../ValidationError";

type BannedKeys<T> = Partial<Record<keyof T, RegExp>>;
type FormattedKeys<T> = Partial<Record<keyof T, RegExp>>;
type EnumKeys<T> = Partial<Record<keyof T, string[]>>;

export class TableSchemaValidator<T extends object> {
    private readonly requiredKeys: (keyof T)[] = [];
    private readonly constantKeys: (keyof T)[] = [];
    private readonly knownKeys: (keyof T)[] = [];

    private readonly bannedKeys: BannedKeys<T> = {};
    private readonly formattedKeys: FormattedKeys<T> = {};
    private readonly enumKeys: EnumKeys<T> = {};
    private readonly mapValidators: MapValidator[] = [];

    constructor (tableSchema: TableSchema<T>, tableName: string) {
        let primaryKeys: (keyof T)[] = [];
        let sortKeys: (keyof T)[] = [];
        for (let key in tableSchema) {
            const v = tableSchema[key];

            this.knownKeys.push(key as keyof T);

            if (v.primary) {
                primaryKeys.push(key as keyof T);
                this.constantKeys.push(key as keyof T);
                this.requiredKeys.push(key as keyof T);
            }
            if (v.sort) {
                sortKeys.push(key as keyof T);
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
                this.mapValidators.push(new MapValidator(key, v));
            }
        }
        if (primaryKeys.length === 0) {
            throw new ValidationError("Table " + tableName + " must include a primary key.");
        }
        if (primaryKeys.length > 1) {
            throw new ValidationError("Table " + tableName + " must only have one primary key.");
        }
        if (sortKeys.length > 1) {
            throw new ValidationError("Table " + tableName + " can not have more than one sort key.");
        }
    }

    validate(obj: T): T {
        ensureHasRequiredKeys(this.requiredKeys, obj);
        ensureNoInvalidCharacters(this.bannedKeys, obj);
        ensureEnums(this.enumKeys, obj);
        ensureFormat(this.formattedKeys, obj);
        ensureNoExtraKeys(this.knownKeys, obj);
        for (const m of this.mapValidators) {
            const mapKey = m.key as keyof T;
            if (obj[mapKey]) {
                m.validate(obj[mapKey]);
            }
        }
        return obj;
    }

    validateUpdateObj(updateObj: UpdateBody<T>) {
        const { set, append, remove } = updateObj;
        ensureDoesNotHaveConstantKeys(this.constantKeys.concat(this.requiredKeys), remove);
        ensureDoesNotHaveConstantKeys(this.constantKeys, append);
        ensureDoesNotHaveConstantKeys(this.constantKeys, set);
        ensureNoInvalidCharacters(this.bannedKeys, set);
        ensureNoExtraKeys(this.knownKeys, set);
        ensureEnums(this.enumKeys, set);
        ensureFormat(this.formattedKeys, set);
        for (const m of this.mapValidators) {
            const mapKey = m.key as keyof T;
            if (set[mapKey]) {
                m.validate(set[mapKey]);
            }
        }
    }
}

class MapValidator {
    readonly key: string;
    readonly schema: MapSchema;

    private readonly knownKeys: string[] = [];
    private readonly requiredKeys: string[] = [];
    private readonly bannedKeys: BannedKeys<any> = {};
    private readonly formattedKeys: FormattedKeys<any> = {};
    private readonly enumKeys: EnumKeys<any> = {};

    constructor(key: string, schema: MapSchema) {
        this.key = key;
        this.schema = schema;

        this.knownKeys = Object.keys(schema.attributes);
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
        }
    }

    validate(mapObj: object) {
        ensureHasRequiredKeys<any>(this.requiredKeys, mapObj);
        ensureNoInvalidCharacters<any>(this.bannedKeys, mapObj);
        ensureEnums(this.enumKeys, mapObj);
        ensureFormat<any>(this.formattedKeys, mapObj);
        ensureNoExtraKeys<any>(this.knownKeys, mapObj);
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

function ensureNoInvalidCharacters<T>(bannedKeys: BannedKeys<T>, obj: T) {
    for (let key in bannedKeys) {
        const value = obj[key];
        if (typeof value === "string") {
            if (bannedKeys[key].test(value)) {
                throw new ValidationError("Invalid character found in key '" + value + "'.");
            }
        }// Else could be undefined.  It's not our job to judge here.
    }
}

function ensureEnums<T>(keysWithEnums: EnumKeys<T>, obj: T) {
    for (let key in keysWithEnums) {
        const value = obj[key];
        if (typeof value === "string") {
            if (keysWithEnums[key].indexOf(value) < 0) {
                throw new ValidationError("Invalid enum value '" + value + "' for key '" + key + "'.");
            }
        }
    }
}

function ensureFormat<T>(format: FormattedKeys<T>, obj: T) {
    for (let key in format) {
        const value = obj[key];
        if (typeof value === "string") {
            if (!format[key].test(value)) {
                throw new ValidationError("Invalid format '" + value + "' for key '" + key + "'.");
            }
        }
    }
}