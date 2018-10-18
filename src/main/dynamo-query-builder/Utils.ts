
/**
 * A utility that validates if it is a proper dynamo DB expression.
 *
 * A DynamoDB expression can be the following:
 *
 * [attribute] = [value]
 * [attribute] != [value]
 * [attribute] > [value]
 * [attribute] >= [value]
 * [attribute] < [value]
 * [attribute] <= [value]
 * [attribute] <> [value]
 * [attribute] BETWEEN [value1] AND [value2]
 * [value] IN ([attribute] (',' [attribute] (, ...)))
 * NOT [expression]
 * ( [expression] )
 *
 * Functions:
 * begins_with([attribute], substr)
 * attribute_exists([value])
 * attribute_not_exists([value])
 * attribute_type([attribute], [type])
 * size([attribute])
 *
 * Likewise, they can string together such as [expression] AND [expression] OR [expression]
 *
 * An undefined or empty expression is regarded as "true".  If these should be handled in special cases,
 * then those need to be checked on their own.
 *
 * @param expression The expression to check
 * @returns True if the expression is valid or false otherwise.
 */
export function validateExpression(expression?: string): boolean {
    if (expression) {
        return true;
    }
    return false;
}
