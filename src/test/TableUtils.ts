import { DynamoDB } from "aws-sdk";

import { backOff } from "../main/utils/Backoff";

export interface Table {
    TableName: string;
    PrimaryKey: string;
    SortKey: string;
    delete(): Promise<void>;
}

export interface TableParams {
    primaryKey?: string;
    sortKey?: string;
}

export function defaultTableInput(TableName: string, params: TableParams = {}): DynamoDB.CreateTableInput {
    const defaultObj = {
        TableName,
        AttributeDefinitions: [{
            AttributeName: params.primaryKey ||  "TestPrimaryKey",
            AttributeType: "S"
        }],
        KeySchema: [{
            AttributeName: params.primaryKey || "TestPrimaryKey",
            KeyType: "HASH"
        }],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    if (params.sortKey) {
        defaultObj.AttributeDefinitions.push({
            AttributeName: params.sortKey,
            AttributeType: "S"
        });
        defaultObj.KeySchema.push({
            AttributeName: params.sortKey,
            KeyType: "RANGE"
        });
    }

    return defaultObj;
}

export async function createTable(db: DynamoDB, params: DynamoDB.CreateTableInput): Promise<Table> {
    console.log("Creating table " );
    console.log(params);
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
        SortKey: findSortKey(params.KeySchema),
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

const findPrimaryKey = findKey.bind(this, "HASH");
const findSortKey = findKey.bind(this, "RANGE");

function findKey(type: string, key: DynamoDB.KeySchema): string {
    const primary = key.find((k) => {
        return k.KeyType === type;
    });
    return (primary) ? primary.AttributeName : undefined;
}