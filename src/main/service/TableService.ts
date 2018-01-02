import { DynamoService } from "./DynamoService";

import { throwIfDoesNotContain, subset } from "../utils/Object";

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

export interface TableServiceProps {
    /**
     * If true, then keys will be removed from an object if they are put or set but not defined
     * in the table schema. By default, this is false which means they will be added as is without
     * modification.
     */
    trimUnknown?: boolean;
}

export class TableService {
    readonly tableName: string;
    readonly tableSchema: TableSchema;
    private readonly db: DynamoService;
    private readonly requiredKeys: string[];
    private readonly knownKeys: string[];
    private readonly props: TableServiceProps;

    constructor(tableName: string, db: DynamoService, tableSchema: TableSchema, props: TableServiceProps = {}) {
        this.tableName = tableName;
        this.db = db;
        this.tableSchema = tableSchema;
        this.props = props;

        // Sort out and validate the key schema
        this.requiredKeys = [];
        this.knownKeys = [];
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
            this.knownKeys.push(key);
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
        const putObj: T = (this.props.trimUnknown) ? subset(obj, this.knownKeys) as T : obj;
        return this.db.put(this.tableName, putObj).then(() => { return putObj; });
    }

    get<T>(key: Partial<T>) {
        return this.db.get(this.tableName, key);
    }
}