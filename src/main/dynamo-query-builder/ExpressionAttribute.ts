import { DynamoDB } from "aws-sdk";

export type Code = string;

export interface ExpressionAttributes {
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
}

export class AttributeBuilder {

    private readonly nameMap: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    private readonly valueMap: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
    private readonly nameReverseMap: {
        [name: string]: string;
    };
    private readonly valueReverseMap: {
        [name: string]: string;
    };

    private nameSize: number;
    private valueSize: number;

    constructor() {
        this.nameMap = {};
        this.valueMap = {};
        this.nameReverseMap = {};
        this.valueReverseMap = {};
        this.nameSize = 0;
        this.valueSize = 0;
    }

    apply(queryExpression?: string): string {
        return replaceItems(replaceItems(queryExpression, this.nameReverseMap), this.valueReverseMap);
    }

    get expression(): ExpressionAttributes {
        const expression: ExpressionAttributes = {};
        if (this.nameSize > 0) {
            expression.ExpressionAttributeNames = { ...this.nameMap };
        }
        if (this.valueSize > 0) {
            expression.ExpressionAttributeValues = { ...this.valueMap };
        }
        return expression;
    }

    addName(name?: string): Code[] {
        if (!name) {
            return;
        }
        // In case it is similar to "nested.attribute"
        const names = name.split(".");
        const codes: Code[] = [];
        for (const n of names) {
            if (this.nameReverseMap[n]) {
                codes.push(this.nameReverseMap[n]);
                continue;
            }
            const key: Code = `#____n_${this.nameSize}`;
            this.nameMap[key] = n;
            this.nameReverseMap[n] = key;
            codes.push(key);
            ++this.nameSize;
        }
        return codes;
    }

    addValue(value?: string | number): Code {
        if (!value) {
            return;
        }
        if (this.valueReverseMap[value]) {
            return this.valueReverseMap[value];
        }
        const key: Code = `:____v_${this.valueSize}`;
        this.valueMap[key] = value;
        this.valueReverseMap[value] = key;
        ++this.valueSize;
        return key;
    }

    /**
     * Merges an expression to this one.
     *
     * The results will contain maps of the original keys to the current keys that are in this builder.
     * This can be used to update the strings of the expressions that refer to these values.
     *
     * @param {ExpressionAttributes} expression
     * @returns {MergeResults}
     * @memberof AttributeBuilder
     */
    merge(expression?: ExpressionAttributes): MergeResults {
        const mergeResults: MergeResults = {
            changedNames: {},
            changedValues: {}
        };
        if (!expression) {
            return mergeResults;
        }

        if (expression.ExpressionAttributeNames) {
            for (const key of Object.keys(expression.ExpressionAttributeNames)) {
                const name = expression.ExpressionAttributeNames[key];
                const codes = this.addName(name);
                if (codes.length > 1) {
                    // That means it was not properly created so tell the developer.
                    throw new Error("Failed Merged: An ExpressionAttributeName can not be a nested attribute.");
                }
                mergeResults.changedNames[key] = codes[0];
            }
        }
        if (expression.ExpressionAttributeValues) {
            for (const key of Object.keys(expression.ExpressionAttributeValues)) {
                const name = expression.ExpressionAttributeValues[key];
                mergeResults.changedValues[key] = this.addValue(name);
            }
        }
        return mergeResults;
    }
}

/**
 * Results of the merge.  The original key is the key that was in the original expression.
 * The value is the new key that exists now in the class.
 *
 * @export
 * @interface MergeResults
 */
export interface MergeResults {
    changedNames: {
        [originalKey: string]: Code;
    };
    changedValues: {
        [originalKey: string]: Code;
    };
}

/**
 * Replaces the items in the expression with the values in the name map.
 *
 * @param {string} [expression=""]
 * @param {{ [name: string]: string }} [nameMap={}]
 * @returns The expression with the replaced items.
 */
function replaceItems(expression: string = "", nameMap: { [name: string]: string } = {}) {
    let newExpression: string = expression;
    const names = Object.keys(nameMap);
    for (const value of names) {
        const regex = new RegExp(value, "g");
        newExpression = expression.replace(regex, nameMap[value]);
    }
    return newExpression;
}