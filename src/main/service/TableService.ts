import { DynamoService, QueryParams, QueryResult, ScanParams, ScanResult } from "./DynamoService";

import { subset, throwIfDoesNotContain } from "../utils/Object";

export { DynamoService, QueryParams, QueryResult, ScanParams, ScanResult };

export type DynamoType = "S" | "N" | "M"

export interface KeySchema {
    /**
     * The type of object that this is.
     */
    type: DynamoType;
    /**
     * Indicates a primary key. A table must include one and only one.
     * 
     * Every put object must include this value. The primary key can not be modified.
     */
    primary?: boolean;
    /**
     * Indicates a sort key. A table may or may not include one, but no more than one.
     * 
     * Every put object must include this if it exists. The sort key can not be modified.
     */
    sort?: boolean;
    /**
     * True if the object requires this key to exist. 
     */
    required?: boolean;
    /**
     * True if the object is constant once set.  This means that the value can not be changed or removed.
     */
    constant?: boolean;
    /**
     * True if the key can not be deleted.  This means that a value must always exists, but it can be modified
     * unless "constant" flag is set.
     */
    notRemovable?: boolean;
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

    query<T>(params: QueryParams): Promise<QueryResult<T>> {
        console.log(params);
        return this.db.query(this.tableName, params);
    }

    scan<T>(params: ScanParams): Promise<ScanResult<T>> {
        console.log(params);
        return this.db.scan(this.tableName, params);
    }
}