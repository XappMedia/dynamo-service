import { sleep } from "./Sleep";

export const DEFAULT_RETRY_ATTEMPTS = 5;
export const DEFAULT_FAILOVER_TIME = 50;
export const DEFAULT_BACKOFF_COEFFICIENT = 2;

/**
 * Creates an object in which every function in the object will be wrapped in a backoff system.
 * @param obj The object in which to back off.
 */
export function backoffObj<T>(obj: T) {
    for (let key in obj) {
        const item = obj[key];
        if (typeof item === "function") {
            // We already established that this is a function, so to make Typescript happy we're going to disable it.
            (obj as any)[key] = backOffFunc(item as any);
        }
    }
}

/**
 * Wraps a function in a backoff method.  This will allow retries of the function until either the
 * function succeeds or the timeout ends.
 * @param func The function to backoff.
 * @param executeProps The props that are to be sent to the function at each iteration.
 */
export function backOffFunc<Return>(func: (...args: any[]) => Return | Promise<Return>, props?: ExecuteProps): (...args: any[]) => Promise<Return> {
    return (...args: any[]) => {
        return backOff<Return>(props, func, ...args);
    };
}

/**
 * Extra props that can be used to extend `executeUntilSuccessOrFail`
 */
export interface ExecuteProps {
    shouldRetry?(e: any): boolean;
    retryAttempts?: number;
    failOffStrategy?(attempts: number): number;
}

/**
 * A function that allows a continuous attempt until the item returns or until the retry is met.
 * A failure is determined when an exception is thrown.
 *
 * The run will receive the arguments that are supplied.
 * The very last argument passed in to the run will always be the number of retries that have been attempted.
 *
 * @param retryAttempts The number of times to retry. Default is 5.
 * @param run The callback to execute.
 * @param failOfStrategy A callback which will determine the amount of
 */
export function backOff<Return>(props: ExecuteProps = {}, run: (...args: any[]) => Return | Promise<Return>, ...args: any[]): Promise<Return> {
    const realProps = { ...{ shouldRetry: alwaysTrue, retryAttempts: DEFAULT_RETRY_ATTEMPTS, failOffStrategy: exponentialTime() }, ...props };
    const { retryAttempts, shouldRetry, failOffStrategy } = realProps;

    const attempt = (attempts: number = 0): Promise<Return> => {
        let promise: Promise<Return>;
        try {
            promise = Promise.resolve(run(...args, attempts));
        } catch (e) {
            promise = Promise.reject(e);
        }
        return promise
            .catch((e) => {
                if (attempts < retryAttempts && shouldRetry(e)) {
                    const sleepTime = failOffStrategy(attempts);
                    return sleep(sleepTime)
                        .then(() => attempt(++attempts));
                } else {
                    return Promise.reject(e);
                }
            });
    };

    return attempt(1);
}

/**
 * Strategy function that will produce linearly increasing values as attempts increase.
 * @param failOverIncrements The amount in which each attempts will increase.
 */
export function linearTime(failOverIncrements: number = DEFAULT_FAILOVER_TIME): (attempts: number) => number {
    return (attempts: number) => {
        return attempts * failOverIncrements;
    };
}

/**
 * Strategy function that will produce logarithmically increasing values as attempts increase.
 * @param failOverIncrements The amount in which each attempts will increase.
 * @param backoffCoefficient A number ot increase the power.  The higher the number, the faster the increase. Default is 2.
 */
export function exponentialTime(failOverIncrements: number = DEFAULT_FAILOVER_TIME, backoffCoefficient: number = DEFAULT_BACKOFF_COEFFICIENT): (attempts: number) => number {
    return (attempts: number) => {
        return failOverIncrements * Math.pow(backoffCoefficient, attempts);
    };
}

/**
 * Convenience function that always returns true.
 */
function alwaysTrue(e: any) {
    return true;
}