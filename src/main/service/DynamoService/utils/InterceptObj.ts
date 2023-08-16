import { Interceptor } from "../IDynamoService";

/**
 * Processes the objects through the interceptors.
 * @param interceptors
 * @param obj
 */
export function interceptObj<T>(interceptors: Interceptor<T>[], obj: T): T;
export function interceptObj<T>(interceptors: Interceptor<T>[], obj: T | T[]): T[];
export function interceptObj<T>(interceptors: Interceptor<T>[], obj: T | T[]): T | T[] {
    return Array.isArray(obj) ? obj.map(o => intercept(interceptors, o)) : intercept(interceptors, obj);
}

/**
 * Processes the object through the interceptors.
 * @param interceptors
 * @param obj
 * @returns
 */
export function intercept<T>(interceptors: Interceptor<T>[], obj: T): T {
    let returnObj: T = obj;
    for (const interceptor of interceptors) {
        returnObj = interceptor(returnObj);
    }
    if (returnObj === undefined) {
        throw new Error("Interceptors must return an object.");
    }
    return returnObj;
}