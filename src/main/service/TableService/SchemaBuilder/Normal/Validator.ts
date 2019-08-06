/**
 * Copyright 2019 XAPPmedia
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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
