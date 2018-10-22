import { TableSchema } from "../service/KeySchema";
import { AttributeBuilder } from "./ExpressionAttribute";
import { SchemaHolder } from "./SchemaHolder";

import { QueryParams } from "../service/TableService";

export interface QueryBuilder<Row extends object, Table extends TableSchema<Row>> {
    primaryKey: Statement<Row, Table>;
    sortKey: Statement<Row, Table>;
}

export interface Statement<Row extends object, Table extends TableSchema<Row>> {
    equals(value: string | number | boolean): Conjunction<Row, Table>;
}

export interface Conjunction<Row extends object, Table extends TableSchema<Row>> {
    and: QueryBuilder<Row, Table>;
    or: QueryBuilder<Row, Table>;
    query: QueryParams;
}

export function query<R extends object, T extends TableSchema<R>>(table: TableSchema<T>): QueryBuilder<R, T> {
    return new QueryBuilderImpl(table);
}

interface Token {
    type: string;
    statement: string | number;
}

interface ParameterToken extends Token {
    type: "Parameter";
    param: keyof QueryParams;
    statement: string;
}

type ComparisonOperators = "=" | "!=" | "<>" | "<" | "<=" | ">" | ">=";

interface ComparisonToken extends Token {
    type: "Comparison";
    statement: ComparisonOperators;
}

interface ValueToken extends Token {
    type: "Value";
    statement: string | number;
}

type Conjunctions = "and" | "or";

interface ConjunctionToken extends Token {
    type: "Conjunction";
    statement: Conjunctions;
}

type Tokens = ConjunctionToken | ValueToken | ComparisonToken | ParameterToken;

class QueryBuilderImpl<Row extends object, Table extends TableSchema<Row>> {
    private readonly schema: SchemaHolder<Table>;
    readonly tokens: Tokens[];
    readonly queryParams: QueryParams;
    readonly attribBuilder: AttributeBuilder;

    constructor(schema: Table) {
        this.schema = new SchemaHolder(schema);
        this.attribBuilder = new AttributeBuilder();
        this.queryParams = {
            KeyConditionExpression: ""
        };
        this.tokens = [];
    }

    get primaryKey(): Statement<Row, Table> {
        return this.applyParameter("KeyConditionExpression", this.schema.primaryKey);
    }

    get sortKey(): Statement<Row, Table> {
        return this.applyParameter("KeyConditionExpression", this.schema.sortKey);
    }

    attribute(attrib: keyof Table): Statement<Row, Table> {
        return this.applyParameter("FilterExpression", attrib);
    }

    private applyParameter(param: keyof QueryParams, attrib: keyof Table) {
        const statement = attrib;
        const token: ParameterToken = {
            type: "Parameter",
            param,
            statement
        };
        this.tokens.push(token);
        return new StatementGenerator<Row, Table>(this);
    }
}

class StatementGenerator<Row extends object, Table extends TableSchema<Row>> implements Statement<Row, Table> {
    private readonly builder: QueryBuilderImpl<Row, Table>;

    constructor(builder: QueryBuilderImpl<Row, Table>) {
        this.builder = builder;

        this.equals = this.addStatement.bind(this, "=");
    }

    equals: (value: string) => ConjunctionGenerator<Row, Table>;

    private addStatement(sign: ComparisonOperators, value: string): ConjunctionGenerator<Row, Table> {
        const comparisonToken: ComparisonToken = {
            type: "Comparison",
            statement: sign
        };
        const valueToken: ValueToken = {
            type: "Value",
            statement: value
        };
        this.builder.tokens.push(comparisonToken, valueToken);
        return new ConjunctionGenerator(this.builder);
    }
}

class ConjunctionGenerator<Row extends object, Table extends TableSchema<Row>> implements Conjunction<Row, Table> {
    private readonly builder: QueryBuilderImpl<Row, Table>;

    constructor(builder: QueryBuilderImpl<Row, Table>) {
        this.builder = builder;
    }

    get and() {
        const token: ConjunctionToken = {
            type: "Conjunction",
            statement: "and"
        };
        this.builder.tokens.push(token);
        return this.builder;
    }

    get or() {
        const token: ConjunctionToken = {
            type: "Conjunction",
            statement: "or"
        };
        this.builder.tokens.push(token);
        return this.builder;
    }

    get query(): QueryParams {
        return buildParams(this.builder.tokens);
    }
}

function buildParams(tokens: Tokens[]): QueryParams {
    const attribBuilder: AttributeBuilder = new AttributeBuilder();
    const params: Partial<QueryParams> = {};

    function add(attribute: keyof QueryParams, statement: string | number) {
        params[attribute] = params[attribute] ? `${params[attribute]} ${statement.toString()}` : statement.toString();
    }

    let lastAttrib: keyof QueryParams;
    let statementToAdd: string | number;
    for (const token of tokens) {
        statementToAdd = token.statement;
        if (token.type === "Parameter") {
            lastAttrib = token.param;
            const codes = attribBuilder.addName(token.statement);
            statementToAdd = codes.join(".");
        } else if (token.type === "Comparison" || token.type === "Value" || token.type === "Conjunction") {
            if (!lastAttrib) {
                // Should never see this but would really like to know if it happens.
                throw new Error("Conjunction found without a previous attribute.");
            }
            if (token.type === "Value") {
                const code = attribBuilder.addValue(token.statement);
                statementToAdd = code;
            }
        }

        add(lastAttrib, statementToAdd);
    }

    if (!params.KeyConditionExpression) {
        throw new Error("Query parameters must include a KeyConditionExpression.");
    }
    for (const attribute in params) {
        const value = params[attribute as keyof QueryParams];
        if (value === "string") {
            params[attribute as keyof QueryParams] = attribBuilder.apply(value);
        }
    }
    console.log(attribBuilder.expression);
    return {
        ...params as QueryParams,
        ...attribBuilder.expression
    };
}
