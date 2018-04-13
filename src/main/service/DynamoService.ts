import { DynamoDB } from "aws-sdk";

import { objHasAttrs } from "../utils/Object";

export type ConstructorDB = DynamoDB | DynamoDB.DocumentClient;

export interface QueryResult<T> {
    Items: T[];
    LastEvaluatedKey?: object;
}

export interface ScanResult<T> {
    Items: T[];
    LastEvaluatedKey?: object;
}

export interface QueryParams {
    KeyConditionExpression: string;
    ExpressionAttributeNames: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
}

export interface ScanParams {
    FilterExpression?: DynamoDB.DocumentClient.ConditionExpression;
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
}

export type Set<T> = Partial<T>;
export type Remove<T> = (keyof T)[];
export type Append<T> = Partial<T>;

/**
 * A common model for an "update" action.
 */
export interface UpdateBody<T> {
    /**
     * Set the value to the item listed.
     *
     * In the format:
     *
     * {
     *    [databaseColumnId]: value
     * }
     */
    set?: Set<T>;
    /**
     * Remove the value entirely from the database.
     *
     * In the format:
     *
     * {
     *    [databaseColumnId]: value
     * }
     */
    remove?: Remove<T>;
    /**
     * Add a collection of items to an array.
     *
     * In the format:
     *
     * {
     *    [databaseColumnId]: value[]
     * }
     */
    append?: Append<T>;
}

/**
 * The type of return that an update action should return.
 *
 * ALL_NEW - The newly updated object is returns.
 * ALL_OLD - The old object before it was update is returned.
 * UPDATED_OLD - only the attributes which were updated are returned. The values will be pre-updated values.
 * UPDATED_NEW - only the attributed which were updated are returned.  The values will be the updated values.
 * NONE - Don't return anything.
 */
export type UpdateReturnType = DynamoDB.DocumentClient.ReturnValue;

/**
 * The object returned from "getUpdateParameters".
 */
interface UpdateParameters {
    UpdateExpression: string;
    ExpressionAttributeNames?: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues?: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
}

export class DynamoService {
    readonly db: DynamoDB.DocumentClient;

    constructor(db: ConstructorDB) {
        this.db = getDb(db);
    }

    put(table: string, obj: DynamoDB.DocumentClient.PutItemInputAttributeMap): Promise<DynamoDB.DocumentClient.PutItemOutput> {
        const params: DynamoDB.PutItemInput = {
            TableName: table,
            Item: obj
        };
        return this.db.put(params).promise();
    }

    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: "NONE"): Promise<void>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: "UPDATED_OLD" | "UPDATED_NEW"): Promise<Partial<T>>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: "ALL_OLD" | "ALL_NEW"): Promise<T>;
    update<T>(table: string, key: DynamoDB.DocumentClient.Key, update: UpdateBody<T>, returns: UpdateReturnType = "NONE"): Promise<void> | Promise<T> | Promise<Partial<T>> {
        const updateExpression = getUpdateParameters(update);
        const params: DynamoDB.UpdateItemInput = {
            TableName: table,
            Key: key,
            ReturnValues: returns,
            ...updateExpression
        };
        return this.db.update(params).promise().then((item) => { return item.Attributes as T; });
    }

    get<T>(table: string, key: DynamoDB.DocumentClient.Key): Promise<T> {
        const params: DynamoDB.GetItemInput = {
            TableName: table,
            Key: key
        };
        return this.db.get(params).promise().then((item) => { return item.Item as T; });
    }

    query<T>(table: string, myParams: QueryParams): Promise<QueryResult<T>> {
        const params: DynamoDB.QueryInput = {
            TableName: table
        };
        addIfExists(params, myParams, ["KeyConditionExpression", "FilterExpression", "ExpressionAttributeNames", "ExpressionAttributeValues"]);
        return this.db.query(params).promise().then((item): QueryResult<T> => {
            return {
                Items: item.Items as T[],
                LastEvaluatedKey: item.LastEvaluatedKey
            };
        });
    }

    scan<T>(table: string, myParams: ScanParams): Promise<ScanResult<T>> {
        const params: DynamoDB.ScanInput = {
            TableName: table,
        };
        addIfExists(params, myParams, ["FilterExpression", "ExpressionAttributeNames", "ExpressionAttributeValues"]);
        return this.db.scan(params).promise().then((item): ScanResult<T> => {
            return {
                Items: item.Items as T[],
                LastEvaluatedKey: item.LastEvaluatedKey
            };
        });
    }
}

function addIfExists<O, P>(original: O, params: P, keys: (keyof O)[] = []): O {
    const p: any = params || {};
    keys.forEach((key: keyof O) => {
        const v = p[key];
        if (v) {
            original[key] = v;
        }
    });
    return original;
}

function getDb(db: ConstructorDB): DynamoDB.DocumentClient {
    if (db instanceof DynamoDB) {
        return new DynamoDB.DocumentClient({ service: db });
    } else if (db instanceof DynamoDB.DocumentClient) {
        return db;
    } else {
        throw new Error("Could not construct DynamoService.  Bad input.");
    }
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
function getUpdateParameters<T>(body: UpdateBody<T>): UpdateParameters {
    let setValues: { [key: string]: any };
    let setAliasMap: { [key: string]: string };
    let setExpression: string;
    const { set, append, remove } = body;
    if (objHasAttrs(set)) {
        setValues = {};
        setAliasMap = {};
        setExpression = "set ";
        let index = 0;
        for (const key in set) {
            if (set.hasOwnProperty(key)) {
                const alias = "#" + key;
                const name = ":a" + ++index;
                setExpression += alias + " = " + name + ",";
                setValues[name] = set[key];
                setAliasMap[alias] = key;
            }
        }
    }

    if (objHasAttrs(append)) {
        setValues = setValues || {};
        setAliasMap = setAliasMap || {};
        setExpression = setExpression || "set ";
        let index = 0;
        for (const key in append) {
            if (set.hasOwnProperty(key)) {
                const alias = "#append" + key;
                const name = ":c" + ++index;
                setExpression += alias + " = list_append(" + alias + "," + name + "),";
                setValues[name] = append[key];
                setAliasMap[alias] = key;
            }
        }
    }

    if (remove && remove.length > 0) {
        setValues = setValues || {};
        setAliasMap = setAliasMap || {};
        setExpression = setExpression ? setExpression.substr(0, setExpression.length - 1) + " remove " : "remove ";
        remove.forEach((key: string) => {
            const alias = "#" + key;
            setExpression += alias + ",";
            setAliasMap[alias] = key;
        });
    }

    if (setExpression) {
        setExpression = setExpression.substr(0, setExpression.length - 1); // Removes the last "," on the string.
    }

    let returnValue: UpdateParameters = { UpdateExpression: setExpression };
    if (objHasAttrs(setValues)) {
        returnValue = { ...returnValue, ...{ ExpressionAttributeValues: setValues } };
    }
    if (objHasAttrs(setAliasMap)) {
        returnValue = { ...returnValue, ...{ ExpressionAttributeNames: setAliasMap } };
    }
    return returnValue;
}