
/**
 * Recursively removes the undefined and blank strings from an object.
 */
export function removeUndefinedAndBlanks<T>(obj: T): T {
    const returnObj: Partial<T> = {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value: any = convertValue(obj[key]);
            if (value !== undefined && value !== null) {
                returnObj[key] = value;
            }
        }
    }
    return returnObj as T;
}

/**
 * Strips a value of all blanks and undefined then returns it.
 *
 * This is a weird double recursive function with `removeUndefinedAndBlanks` so recommended to not expose to the wild.
 * @param v The javascript object ot check.
 */
function convertValue(v: any) {
    if (Array.isArray(v)) {
        return v.reduce((last, v) => {
            const newV = convertValue(v);
            if (newV !== undefined && newV !== null) {
                last.push(newV);
            }
            return last;
        }, []);
    } else if (v !== undefined && v !== null && typeof v === "object") {
        return removeUndefinedAndBlanks(v);
    } else if (typeof v !== "string" || v.length > 0) {
        return v;
    }
    return undefined;
}