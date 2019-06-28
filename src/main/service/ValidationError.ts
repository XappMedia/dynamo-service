/**
 * Error thrown when the client passes in improper errors.
 */
export class ValidationError extends Error {
    constructor(msg: string | string[]) {
        super(Array.isArray(msg) ? `Errors: [ ${msg.join(",\n")} ]` : msg);
    }
}

export default ValidationError;