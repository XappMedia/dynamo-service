/**
 * Copyright 2019 XAPPmedia
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { CreateTableCommandInput, DynamoDB, KeySchemaElement, TableDescription } from "@aws-sdk/client-dynamodb";

import { backOff } from "../utils/Backoff";

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

export function defaultTableInput(TableName: string, params: TableParams = {}): CreateTableCommandInput {
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

export async function createTable(db: DynamoDB, params: CreateTableCommandInput): Promise<Table> {
    const getResult = (description: TableDescription) => ({
        TableName: description.TableName,
        PrimaryKey: findPrimaryKey(description.KeySchema),
        SortKey: findSortKey(description.KeySchema),
        delete(): Promise<void> {
            return deleteTable(db, { TableName: description.TableName });
        }
    });
    try {
        const description = await db.describeTable({ TableName: params.TableName });
        return getResult(description.Table);
    } catch (e) {
        if (e.code !== "ResourceNotFoundException") {
            throw e; // Oops
        }
        // Else the table was not found, so then let's create it.
    }
    const output = await db.createTable(params);
    let description = output.TableDescription;
    await backOff({ retryAttempts: 20 }, async () => {
        while (description.TableStatus !== "ACTIVE") {
            const output = await db.describeTable({ TableName: params.TableName });
            description = output.Table;
        }
    });

    return getResult(description);
}

export async function deleteTable(db: DynamoDB, params: { TableName: string }): Promise<void> {
    await backOff({ retryAttempts: 5}, async () => {
        await db.deleteTable(params);
    });
}

const findPrimaryKey = findKey.bind(this, "HASH");
const findSortKey = findKey.bind(this, "RANGE");

function findKey(type: string, key: KeySchemaElement[]): string {
    const primary = key.find((k) => {
        return k.KeyType === type;
    });
    return (primary) ? primary.AttributeName : undefined;
}