import { DynamoDB } from "aws-sdk";

import { backOff } from "../main/utils/Backoff";

export interface Table {
    TableName: string;
    PrimaryKey: string;
    delete(): Promise<void>;
}

export function defaultTableInput(TableName: string, primaryKey: string = "TestPrimaryKey"): DynamoDB.CreateTableInput {
    return {
        TableName,
        AttributeDefinitions: [{
            AttributeName: "TestPrimaryKey",
            AttributeType: "S"
        }],
        KeySchema: [{
            AttributeName: "TestPrimaryKey",
            KeyType: "HASH"
        }],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    }
}

export async function createTable(db: DynamoDB, params: DynamoDB.CreateTableInput): Promise<Table> {
    const output = await db.createTable(params).promise();
    let description = output.TableDescription;
    await backOff({ retryAttempts: 20 }, async () => {
        while (description.TableStatus !== "ACTIVE") {
            const output = await db.describeTable().promise();
            description = output.Table;
        }
    });

    return {
        TableName: params.TableName,
        PrimaryKey: findPrimaryKey(params.KeySchema),
        delete(): Promise<void> {
            return deleteTable(db, { TableName: params.TableName });
        }
    };
}

export async function deleteTable(db: DynamoDB, params: { TableName: string }): Promise<void> {
    await backOff({ retryAttempts: 5}, async () => {
        await db.deleteTable(params).promise();
    });
}

function findPrimaryKey(key: DynamoDB.KeySchema) {
    const primary = key.find((k) => {
        return k.KeyType === "HASH";
    });
    return primary.AttributeName;
}