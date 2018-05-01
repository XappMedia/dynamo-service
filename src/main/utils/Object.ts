/**
 * A Utility function to determine if an object has attributes or not.
 *
 *
 * @param obj Object to check
 * @return True if the object exists and has attributes or false otherwise.
 */
export function objHasAttrs(obj: object): boolean {
    const testObj = obj || {};
    return (Object.keys(testObj).length > 0 && testObj.constructor === Object);
}

export type ValidationErrorHandler = (keys: string[], error: Error) => void;

function defaultValidationErrorHandler(keys: string[], error: Error) {
    throw error;
}

/**
 * A validation function that can check if an object contains an attribute that is should not have.
 * @param obj The object to check.
 * @param requiredAttrs The attributes that are not allowed.
 * @param onError An optional error handler that allows for custom messages or actions.  The keys passed in will be the keys that are banned which are contained in the item.
 */
export function throwIfDoesContain(obj: object,  bannedAttrs: string[], onError?: ValidationErrorHandler): void;
export function throwIfDoesContain(obj: string[],  bannedAttrs: string[], onError?: ValidationErrorHandler): void;
export function throwIfDoesContain(obj: object | string[],  bannedAttrs: string[], onError: ValidationErrorHandler = defaultValidationErrorHandler): void {
    if (!obj || !bannedAttrs || bannedAttrs.length === 0) {
        // It obviously does not contain the items.
        return;
    }

    const sub = subset(obj, bannedAttrs);
    const keys = Object.keys(sub);
    if (keys.length > 0) {
        const error = new Error("Object can not contain keys: '" + keys.join(", ") + "'.");
        onError(keys, error);
    }
}

/**
 * A validation function that can check if an object contains the required attributes and throws an error if they are not part of it.
 * @param obj Object to check
 * @param requiredAttrs The attributes in the object that are required.
 * @param undefinedPermitted True if the object is allowed to be undefined.  Default is false in which case an error will be thrown.
 * @param onError An optional error handler that allows for custom messages or actions.  The keys passed in will be the keys that were required but are not inside the object.
 */
export function throwIfDoesNotContain<T>(obj: T, requiredAttrs: string[], undefinedPermitted?: boolean, onError: ValidationErrorHandler = defaultValidationErrorHandler): void {
    if (!obj) {
        if (undefinedPermitted) {
            return;
        } else {
            throw new Error("Object can not be undefined.");
        }
    }

    if (!requiredAttrs || requiredAttrs.length === 0) {
        // There's nothing required so let it go.
        return;
    }

    const subs = subset(obj, requiredAttrs);
    const keys: string[] = Object.keys(subs);
    if (keys.length !== requiredAttrs.length) {
        const difference = requiredAttrs.filter((key: string): boolean => {
            return keys.indexOf(key) < 0;
        });
        const error = new Error("Object must contain keys: '" + difference.join(", "));
        onError(difference, error);
    }
    // Rejoice!
}

/**
 * A validation function that can check an object contains properties that should not exist in the object.
 * @param obj The object to check.
 * @param restrictAttrs The attributes to restrict to the object to.  Will not check if empty.
 * @param undefinedPermitted Set to true if the object is allowed to be undefined.  Default is false in which case an error will be thrown.
 * @param onError An optional error handler that allows for custom messages or actions.  The keys passed in will be the keys that were not allowed in the object but were.
 */
export function throwIfContainsExtra<T extends object>(obj: T, restrictAttrs: (keyof T)[], undefinedPermitted?: boolean, onError: ValidationErrorHandler = defaultValidationErrorHandler): void {
    if (!obj) {
        if (undefinedPermitted) {
            return;
        } else {
            throw new Error("Object can not be undefined.");
        }
    }

    if (!restrictAttrs || restrictAttrs.length === 0) {
        return;
    }

    const removed = removeItems(obj, restrictAttrs);
    const keys = Object.keys(removed);
    if (keys.length > 0) {
        const error = new Error("Object does not pass validation. Keys: '" + keys.join(", ") + "' are not permitted.");
        onError(keys, error);
    }
    // Rejoice!
}

/**
 * A function that will return a subset of a given object keeping only the attributes that it contains.
 *
 * The original object is not affected.
 *
 * @param obj Object to create a subset for.
 * @param attrs The attributes to retain in the object.
 */
export function subset<T>(obj: T, attrs: string[]): Partial<T>;
export function subset(obj: string[], attrs: string[]): string[];
export function subset<T>(obj: T | string[], attrs: string[]): Partial<T> | string[] {
    if (!obj) {
        return obj;
    }

    if (!attrs || attrs.length === 0) {
        return {};
    }

    if (Array.isArray(obj)) {
        // String array
        return obj.reduce((last: string[], i: string): string[] => {
            if (attrs.indexOf(i) >= 0) {
                last.push(i);
            }
            return last;
        }, []);
    }

    return attrs.reduce((last: Partial<T>, value: keyof T): Partial<T> => {
        if (obj.hasOwnProperty(value)) {
            last[value] = obj[value];
        }
        return last;
    }, {});
}

export type ValidateKeyCallback = (key: string | number, value: any) => boolean;

/**
 * A function that's the opposite of "subset" in which it will remove the attributes that are given in the function.
 *
 * The original object is not affected.
 *
 * @param obj Object to remove the items from.
 * @param attrs The attribute keys to remove from the object. It can be strings for generic javascript objects or
 *      numbers for arrays.
 *      It can also be a function that returns a boolean where "true" means to keep and "false" means to remove.
 *      In the case for functions, the first parameters will be the "key" of the object (string for objects and numbers for arrays.).
 *
 */
export function removeItems<T extends object>(obj: T, attrs: (keyof T)[]): Partial<T>;
export function removeItems(obj: string[], attrs: string[]): string[];
export function removeItems<T extends object>(obj: T | string[], attrs: string[]): Partial<T> | string[] | any[] {
    if (!obj) {
        return obj;
    }

    if (!attrs || attrs.length === 0) {
        return obj;
    }

    if (Array.isArray(obj)) {
        // String array.  Remove the attrs from it.
        const copy = obj.slice();
        for (let attr of attrs) {
            const index = copy.indexOf(attr);
            if (index >= 0) {
                copy.splice(index, 1);
            }
        }
        return copy;
    }

    return attrs.reduce((last, attr) => {
        if (last[attr]) {
            delete last[attr];
        }
        return last;
    }, {...obj as any});
}