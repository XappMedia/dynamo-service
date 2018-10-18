import { TableSchema } from "../service/KeySchema";

const NOT_APPLICABLE: NotApplicable = "_______N/A";
type NotApplicable = "_______N/A";

export type TableKey<Table extends TableSchema> = keyof Table;

export class SchemaHolder<Table extends TableSchema> {
    protected readonly schema: Table;

    private internalPrimaryKey: TableKey<Table>;
    private internalSortKey: TableKey<Table> | NotApplicable;

    private readonly keys: TableKey<Table>[];

    constructor(schema: Table) {
        this.schema;
        this.keys = Object.keys(this.schema);
    }

    get primaryKey(): TableKey<Table> {
        if (this.internalPrimaryKey !== undefined) {
            return this.internalPrimaryKey;
        }
        for (const key of this.keys) {
            const keySchema = this.schema[key];
            if (keySchema.primary) {
                return this.internalPrimaryKey = key;
            }
        }
    }

    get sortKey(): TableKey<Table> {
        if (this.internalSortKey) {
            return (this.internalSortKey === NOT_APPLICABLE) ?  undefined : this.internalSortKey;
        }
        for (const key of Object.keys(this.schema)) {
            const keySchema = this.schema[key];
            if (keySchema.sort) {
                return this.internalPrimaryKey = key;
            }
        }
        this.internalSortKey = NOT_APPLICABLE;
    }
}
