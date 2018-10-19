/**
 * Error thrown when the client passes in improper errors.
 */
export class ValidationError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}