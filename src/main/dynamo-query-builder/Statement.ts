import { Expression } from "./Expression";

export interface Statement extends Expression {
    key: string;
}

export interface KeyValueStatement extends Statement {
    key: string;
    value: string;
}

export function equals(key: string, value: string): KeyValueStatement {
    return {
        key, value,
        expression: () => `${key}=${value}`
    };
}

export function doesNotExist(key: string): Statement {
    return {
        key,
        expression: () => `attribute_not_exist(${key})`
    };
}