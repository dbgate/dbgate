import { NamedObjectInfo, RangeDefinition } from "@dbgate/types";

// export interface Command {
// }

export interface Select {
  commandType: "select";

  from: FromDefinition;

  columns?: ResultField[];
  topRecords?: number;
  range?: RangeDefinition;
  distinct?: boolean;
  selectAll?: boolean;
}

export type Command = Select;

// export interface Condition {
//   conditionType: "eq" | "not" | "binary";
// }

export interface UnaryCondition {
  expr: Expression;
}

export interface BinaryCondition {
  operator: "=" | "!=" | "<" | ">" | ">=" | "<=";
  conditionType: "binary";
  left: Expression;
  right: Expression;
}

export interface NotCondition extends UnaryCondition {
  conditionType: "not";
}

export type Condition = BinaryCondition | NotCondition;

export interface Source {
  name?: NamedObjectInfo;
  alias?: string;
  subQuery?: Select;
  subQueryString?: string;
}

export type JoinType = "LEFT JOIN" | "INNER JOIN" | "RIGHT JOIN";

export interface Relation {
  source: Source;
  conditions: Condition[];
  joinType: JoinType;
}

export interface FromDefinition {
  source: Source;
  relations?: Relation[];
}

// export interface Expression {
//   exprType: "column" | "value" | "string" | "literal" | "count";
// }

export interface ColumnRefExpression {
  exprType: "column";
  columnName: string;
  source?: Source;
}

export interface ValueExpression {
  exprType: "value";
  value: any;
}

export type Expression = ColumnRefExpression | ValueExpression;

export interface ResultField {
  expr: ValueExpression | ColumnRefExpression;
  alias?: string;
}
