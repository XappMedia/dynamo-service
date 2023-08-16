import { DynamoDBPutItemMap, DynamoDBWriteRequest, DynamoDBKey } from "../IDynamoService";

/**
 * Converts the object or objects in to a series of Batch Put Reqeusts.
 * @param objs
 * @returns
 */
export function createPutBatchWriteRequests(objs: DynamoDBPutItemMap | DynamoDBPutItemMap[]): DynamoDBWriteRequest[] {
    if (Array.isArray(objs)) {
        return objs.map((Item) => {
            return {
                PutRequest: {
                    Item
                }
            };
        });
    } else {
        return [{
            PutRequest: {
                Item: objs
            }
        }];
    }
}

/**
 * Converts the object or objects in to a series of Batch Delete Requests.
 * @param Keys
 * @returns
 */
export function createDeleteBatchWriteRequests(Keys: DynamoDBKey | DynamoDBKey[]): DynamoDBWriteRequest[] {
    if (Array.isArray(Keys)) {
        return Keys.map((Key) => {
            return {
                DeleteRequest: {
                    Key
                }
            };
        });
    } else {
        return [{
            DeleteRequest: {
                Key: Keys
            }
        }];
    }
}