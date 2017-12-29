import { DynamoDB } from "aws-sdk";

export type ConstructorDB = DynamoDB | DynamoDB.DocumentClient;

export interface QueryResult<T> {
    Items: T[];
    LastEvaluatedKey?: object;
}

export interface QueryParams {
    KeyConditionExpression: string;
    ExpressionAttributeNames: DynamoDB.DocumentClient.ExpressionAttributeNameMap;
    ExpressionAttributeValues: DynamoDB.DocumentClient.ExpressionAttributeValueMap;
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

    get<T>(table: string, key: DynamoDB.DocumentClient.Key): Promise<T> {
        const params: DynamoDB.GetItemInput = {
            TableName: table,
            Key: key
        };
        return this.db.get(params).promise().then((item) => { return item.Item as T; });
    }

    query<T>(table: string, myParams: QueryParams): Promise<QueryResult<T>> {
        console.log(myParams);
        const params: DynamoDB.QueryInput = {
            TableName: table,
            KeyConditionExpression: myParams.KeyConditionExpression,
            ExpressionAttributeNames: myParams.ExpressionAttributeNames,
            ExpressionAttributeValues: myParams.ExpressionAttributeValues
        };
        return this.db.query(params).promise().then((item): QueryResult<T> => {
            return {
                Items: item.Items as T[],
                LastEvaluatedKey: item.LastEvaluatedKey
            };
        });
    }
}

function getDb(db: ConstructorDB): DynamoDB.DocumentClient {
    if (db instanceof DynamoDB) {
        return new DynamoDB.DocumentClient({ service: db })
    } else if (db instanceof DynamoDB.DocumentClient) {
        return db;
    } else {
        throw new Error("Could not construct DynamoService.  Bad input.");
    }
}