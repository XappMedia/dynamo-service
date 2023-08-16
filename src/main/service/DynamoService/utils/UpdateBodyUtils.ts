import { StringKeys } from "../../../types/StringKeys";
import { objHasAttrs } from "../../../utils/Object";
import { DynamoDBExpressionAttributeNames, Set, UpdateBody, UpdateParameters } from "../IDynamoService";


/**
 * This will transfer all undefined, null, empty strings, -0, and NaN from the "set" item to the "remove" so they'll be deleted
 * instead of crashing dynamo.
 * @param body  The update body to use.
 */
export function transferUndefinedToRemove<T>(body: UpdateBody<T>): UpdateBody<T> {
    const set: Set<T> = { ...body.set as any };
    const remove: string[] = (body.remove || []).slice();

    const setKeys = Object.keys(set) as StringKeys<T>[];
    for (const key of setKeys) {
        const item = set[key] as any;
        if (!item) {
            if (typeof item !== typeof true && item !== 0) {
                // Boolean "false" and numbers "0" and "-0" are the only falsey that we like.
                remove.push(key);
                delete set[key];
            }
        }
    }
    return { ...body, set, remove } as UpdateBody<T>;
}


/**
 * A Utility method that will retrieve an UpdateBody and convert to the
 * Expression attributes for a DynamoDB update.
 *
 * You can just apply the object like so:
 *
 * const parameters = getUpdateParameters(body);
 * const params: DynamoDB.DocumentClient.UpdateItemInput = {
 *    ...parameters
 * }
 *
 * @param body The body to include.
 * @return An object that contains the attributes:
 *      {
 *          UpdateExpression: items to update.
 *          ExpressionAttributeValues:  The values of such items.
 *          ExpressionAttributeNames: The names that are mapped to those expressions.
 *      }
 */
export function getUpdateParameters<T>(body: UpdateBody<T>): UpdateParameters {
    let setValues: { [key: string]: any };
    let setAliasMap: { [key: string]: string };
    let setExpression: string;
    const { set, append, remove, prepend } = body;
    if (objHasAttrs(set)) {
        setValues = {};
        setAliasMap = {};
        setExpression = "set ";
        let index = 0;
        for (const key in set) {
            if (set.hasOwnProperty(key)) {
                const splitKeys = key.split(".");
                const aliases: string[] = [];
                for (const splitKey of splitKeys) {
                    const matchKey = splitKey.match(/^([^[\]]+)(\[[0-9]+\])?$/);
                    const alias = "#__dynoservice_updateset_a" + ++index + (matchKey[2] || "");
                    setAliasMap[alias] = matchKey[1];
                    aliases.push(alias);
                }
                const name = ":__dynoservice_updateset_a" + ++index;
                setExpression += aliases.join(".") + " = " + name + ",";
                setValues[name] = set[key as StringKeys<T>];
            }
        }
    }

    if (objHasAttrs(append)) {
        setValues = setValues || {};
        setAliasMap = setAliasMap || {};
        setExpression = setExpression || "set ";
        let index = 0;
        for (const key in append) {
            if (append.hasOwnProperty(key)) {
                const alias = "#__dynoservice_updateappend_c" + index;
                const name = ":__dynoservice_updateappend_c" + ++index;
                setExpression += alias + " = list_append(if_not_exists(" + alias + ", :__dynoservice_update_append_empty_list)," + name + "),";
                setValues[name] = append[key];
                setValues[":__dynoservice_update_append_empty_list"] = [];
                setAliasMap[alias] = key;
            }
        }
    }

    if (objHasAttrs(prepend)) {
        setValues = setValues || {};
        setAliasMap = setAliasMap || {};
        setExpression = setExpression || "set ";
        let index = 0;
        for (const key in prepend) {
            if (prepend.hasOwnProperty(key)) {
                const alias = "#__dynoservice_prepend_c" + index;
                const name = ":__dynoservice_prepend_c" + ++index;
                setExpression += alias + " = list_append(" + name + ", if_not_exists(" + alias + ", :__dynoservice_update_prepend_empty_list)),";
                setValues[name] = prepend[key];
                setValues[":__dynoservice_update_prepend_empty_list"] = [];
                setAliasMap[alias] = key;
            }
        }
    }

    if (remove && remove.length > 0) {
        setValues = setValues || {};
        setAliasMap = setAliasMap || {};
        setExpression = setExpression ? setExpression.substr(0, setExpression.length - 1) + " remove " : "remove ";
        remove.forEach((key: string, index) => {
            const splitKeys = key.split(".");
            const aliases = [];
            for (const splitKey of splitKeys) {
                const matchKey = splitKey.match(/^([^[\]]+)(\[[0-9]+\])?$/);
                const alias = "#__dynoservice_updateremove_r" + ++index + (matchKey[2] || "");
                setAliasMap[alias] = matchKey[1];
                aliases.push(alias);
            }
            setExpression += aliases.join(".") + ",";
        });
    }

    if (setExpression) {
        setExpression = setExpression.slice(0, setExpression.length - 1); // Removes the last "," on the string.
    }

    let returnValue: UpdateParameters = { UpdateExpression: setExpression };
    if (objHasAttrs(setValues)) {
        returnValue = { ...returnValue, ...{ ExpressionAttributeValues: setValues } };
    }
    if (objHasAttrs(setAliasMap)) {
        // If there are any arrays listed, then we need to remove them here.
        const ExpressionAttributeNames = Object.keys(setAliasMap).reduce((last, currentKey) => {
            last[currentKey.replace(/\[[0-9]+\]$/, "")] = setAliasMap[currentKey];
            return last;
        }, {} as DynamoDBExpressionAttributeNames);
        returnValue = { ...returnValue, ...{ ExpressionAttributeNames } };
    }
    return returnValue;
}