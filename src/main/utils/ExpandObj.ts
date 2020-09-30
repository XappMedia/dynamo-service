/**
 * This expands an object with keys that are in dot notation.
 *
 * For example:
 *
 * {
 *    "one.two.three": {
 *       param1: "Value"
 *    }
 * }
 *
 * becomes:
 *
 * {
 *    one: {
 *       two: {
 *          three: {
 *              param1: "Value"
 *          }
 *       }
 *    }
 * }
 *
 * @export
 * @param {*} obj
 */
export function expandObj(obj: any) {
    // tslint:disable:no-null-keyword
    if (typeof obj !== "object" || obj == null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; ++i) {
            obj[i] = expandObj(obj[i]);
        }
        return obj;
    }

    const newObj: any = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
        const value = expandObj(obj[key]);
        const splitKeys = key.split(".");
        newObj[splitKeys[0]] = splitKeys.length === 1 ?
            value :
            expandObj({ [splitKeys.slice(1).join(".")] : value });
    }
    return newObj;
}