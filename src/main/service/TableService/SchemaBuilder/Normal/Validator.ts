import { NormalSchema } from "./NormalSchemaBuilder";

/**
 * A validator will take the current schema and the object being validated
 * and return any errors that may arise.
 *
 * Validators are only relevant to items that are going in to the database
 * through a PUT or UPDATE method. Items that are coming out or
 * are already in the database should be ignored as they are already
 * passed validation (or existed before validation was a thing).
 *
 * It returns undefined or empty array if there are no errors.
 */
export type Validator<Obj, T extends NormalSchema = NormalSchema> = (key: string, schema: T, obj: Obj) => string | string[];
