import { Expression } from "./Expression";

export interface Conjunction extends Expression {
    readonly conjunction: string;
}

export function and(): Conjunction {
    return {
        conjunction: "and",
        expression: () => "and"
    };
}

export function or() {
    return {
        conjunction: "or",
        expression: () => "or"
    };
}