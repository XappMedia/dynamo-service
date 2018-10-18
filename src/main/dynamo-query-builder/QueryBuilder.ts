import { DynamoDB } from "aws-sdk";
import { TableSchema } from "../service/KeySchema";
import { Builder } from "./Builder";
import { AttributeBuilder } from "./ExpressionAttribute";
import { SchemaHolder } from "./SchemaHolder";

export type Query = DynamoDB.QueryInput;

export class QueryBuilder<Table extends TableSchema> extends Builder<Query>  {

    private readonly schema: SchemaHolder<Table>;
    private readonly attribBuilder: AttributeBuilder;

    constructor(schema: Table) {
        super();
        this.schema = new SchemaHolder(schema);
        this.attribBuilder = new AttributeBuilder();
    }

    primaryKey(key: (keyof Table)): Statement<Query> {
        if (this.schema.primaryKey !== key) {
            throw new Error(`Primary key ${key} is not the primary key for the table.`);
        }
        this.attribBuilder.addName(key);
        return new Statement<Query>(this, key);
    }

    build() {
        return {
            TableName: "No",
            KeyConditionExpression: ""
        };
    }
}

export class Statement<BuilderObj extends object> {

    private readonly builder: Builder<BuilderObj>;
    private readonly key: string;

    constructor(builder: Builder<BuilderObj>, key: string) {
        this.key = key;
        this.builder;
        console.log(this.key);
    }

    equals(value: string): Builder<BuilderObj> {
        return this.builder;
    }
}

export class Conjunction<BuilderObj extends object> {
    private builder: Builder<BuilderObj>;

    constructor(builder: Builder<BuilderObj>) {
        this.builder = builder;
    }

    and() {
        return this.builder;
    }

    or() {
        return this.builder;
    }
}