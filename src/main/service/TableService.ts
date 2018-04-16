import { DynamoService, QueryParams, QueryResult, ScanParams, ScanResult, UpdateBody, UpdateReturnType } from "./DynamoService";

import { subset, throwIfDoesContain, throwIfDoesNotContain } from "../utils/Object";

export { DynamoService, QueryParams, QueryResult, ScanParams, ScanResult, UpdateBody, UpdateReturnType };

export type DynamoType = "S" | "N" | "M" | "L";

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

    private readonly requiredKeys: string[] = [];
    private readonly constantKeys: string[] = [];
    private readonly knownKeys: string[] = [];

    private readonly db: DynamoService;
    private readonly props: TableServiceProps;

    constructor(tableName: string, db: DynamoService, tableSchema: TableSchema, props: TableServiceProps = {}) {
        this.tableName = tableName;
        this.db = db;
        this.tableSchema = tableSchema;
        this.props = props;

        // Sort out and validate the key schema
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
            if (v.constant) {
                this.constantKeys.push(key);
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

    update<T>(key: Partial<T>, obj: UpdateBody<T>): Promise<void>;
    update<T>(key: Partial<T>, obj: UpdateBody<T>, returnType: "NONE"): Promise<void>;
    update<T>(key: Partial<T>, obj: UpdateBody<T>, returnType: "UPDATED_OLD" | "UPDATED_NEW"): Promise<Partial<T>>;
    update<T>(key: Partial<T>, obj: UpdateBody<T>, returnType: "ALL_OLD" | "ALL_NEW"): Promise<T>;
    update<T>(key: Partial<T>, obj: UpdateBody<T>, returnType?: string): Promise<void>;
    update<T>(key: Partial<T>, obj: UpdateBody<T>, returnType?: UpdateReturnType): Promise<void> | Promise<T> | Promise<Partial<T>> {
        throwIfDoesContain(obj.remove, this.constantKeys.concat(this.requiredKeys));
        throwIfDoesContain(obj.set, this.constantKeys);
        throwIfDoesContain(obj.append, this.constantKeys);
        return this.db.update<T>(this.tableName, key, obj, returnType);
    }

    get<T>(key: Partial<T>): Promise<T>;
    get<T>(key: Partial<T>[]): Promise<T[]>;
    get<T, P extends keyof T>(key: Partial<T>, projection: P | P[]): Promise<Pick<T, P>>;
    get<T, P extends keyof T>(key: Partial<T>[], projection: P | P[]): Promise<Pick<T, P>[]>;
    get<T, P extends keyof T>(key: Partial<T> | Partial<T>[], projection?: P | P[]): Promise<Pick<T, P>> | Promise<T> | Promise<Pick<T, P>[]> | Promise<T[]>  {
        return this.db.get<T, P>(this.tableName, key, projection);
    }

    query<T>(params: QueryParams): Promise<QueryResult<T>>;
    query<T, P extends keyof T>(params: QueryParams, projection: P | P[]): Promise<QueryResult<Pick<T, P>>>;
    query<T, P extends keyof T>(params: QueryParams, projection?: P | P[]): Promise<QueryResult<T>> | Promise<QueryResult<Pick<T, P>>> {
        return this.db.query<T, P>(this.tableName, params, projection);
    }

    scan<T>(params: ScanParams): Promise<ScanResult<T>>;
    scan<T, P extends keyof T>(params: ScanParams, projection: P | P[]): Promise<Pick<T, P>>;
    scan<T, P extends keyof T>(params: ScanParams, projection?: P | P[]): Promise<ScanResult<T>> | Promise<ScanResult<Pick<T, P>>>  {
        return this.db.scan<T, P>(this.tableName, params, projection);
    }
}