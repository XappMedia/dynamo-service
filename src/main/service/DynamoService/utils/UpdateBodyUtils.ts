import { StringKeys } from "../../../types/StringKeys";
import { Set, UpdateBody } from "../IDynamoService";


/**
 * This will transfer all undefined, null, empty strings, -0, and NaN from the "set" item to the "remove" so they'll be deleted
 * instead of crashing dynamo.
 * @param body  The update body to use.
 */
export function transferUndefinedToRemove<T>(body: UpdateBody<T>): UpdateBody<T> {
    const set: Set<T> = { ...body.set as any };
    const remove: string[] = (body.remove || []).slice();

    const setKeys = Object.keys(set) as StringKeys<T>[];
    for (const key of setKeys) {
        const item = set[key] as any;
        if (!item) {
            if (typeof item !== typeof true && item !== 0) {
                // Boolean "false" and numbers "0" and "-0" are the only falsey that we like.
                remove.push(key);
                delete set[key];
            }
        }
    }
    return { ...body, set, remove } as UpdateBody<T>;
}
