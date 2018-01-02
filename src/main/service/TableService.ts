import { DynamoService } from "./DynamoService";

import { throwIfDoesNotContain } from "../utils/Object";

export interface KeySchema {
    type: "S" | "N" | "M";
    primary?: boolean;
    sort?: boolean;
    required?: boolean;
    modifiable?: boolean;
}

export interface TableSchema {
    [key: string]: KeySchema;
}

export class TableService {
    readonly tableName: string;
    private readonly db: DynamoService;
    readonly tableSchema: TableSchema;
    private readonly requiredKeys: string[];

    constructor(tableName: string, db: DynamoService, tableSchema: TableSchema) {
        this.tableName = tableName;
        this.db = db;
        this.tableSchema = tableSchema;

        // Sort out and validate the key schema
        this.requiredKeys = [];
        let primaryKeys = 0;
        let sortKeys = 0;
        for (let key in tableSchema) {
            const v = tableSchema[key];
            if (v.primary) {
                ++primaryKeys;
            }
            if (v.sort) {
                ++sortKeys;
            }
            if (v.required) {
                this.requiredKeys.push(key);
            }
        }
        if (primaryKeys === 0) {
            throw new Error("Table " + tableName + " must include a primary key.");
        }
        if (primaryKeys > 1) {
            throw new Error("Table " + tableName + " must only have one primary key.");
        }
        if (sortKeys > 1) {
            throw new Error("Table " + tableName + " can not have more than one sort key.");
        }
    }

    put<T>(obj: T): Promise<T> {
        throwIfDoesNotContain(obj, this.requiredKeys);

        return this.db.put(this.tableName, obj).then(() => { return obj; });
    }
}