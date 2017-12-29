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
            (obj as any)[key] = (...args: any[]) => {
                return backOff(undefined, item, ...args);
            };
        }
    }
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
export async function backOff<Return>(props: ExecuteProps = {}, run: (...args: any[]) => Promise<Return>, ...args: any[]): Promise<Return> {
    let retries = 0;
    let sleepTime = 0;
    const realProps = { ...{ shouldRetry: alwaysTrue, retryAttempts: DEFAULT_RETRY_ATTEMPTS, failOffStrategy: exponentialTime() }, ...props };
    const { retryAttempts, shouldRetry, failOffStrategy } = realProps;
    while (true) {
        try {
            return await run(...args, retries);
        } catch (e) {
            if (++retries < retryAttempts && shouldRetry(e)) {
                await sleep(sleepTime);
                sleepTime = failOffStrategy(retries);
            } else {
                throw e;
            }
        }
    }
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
 * Strategy function that will produce logarithmicly increasing values as attempts increase.
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