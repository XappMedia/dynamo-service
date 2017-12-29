/**
 * Function that can be used to sleep until execution.
 * @param ms  The number of milliseconds to wait until execution.
 */
export function sleep(ms: number): Promise<any> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}