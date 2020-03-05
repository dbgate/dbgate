import { NamedObjectInfo, RangeDefinition } from "@dbgate/types";

export interface Command {
  commandType: "select";
}

export interface Select extends Command {
  from: NamedObjectInfo;

  topRecords?: number;
  range?: RangeDefinition;
  distinct?: boolean;
  selectAll?: boolean;
}

export interface Condition {
  conditionType: "eq" | "not";
}

export interface UnaryCondition extends Condition {
  expr: Expression;
}

export interface BinaryCondition extends Condition {
  left: Expression;
  right: Expression;
}

export interface NotCondition extends UnaryCondition {
  conditionType: "not";
}

export interface Source {
  name: NamedObjectInfo;
  alias: string;
  subQuery: Select;
  subQueryString: string;
}

export type JoinType = "LEFT JOIN" | "INNER JOIN" | "RIGHT JOIN";

export interface Relation {
  source: Source;
  conditions: Condition[];
  joinType: JoinType;
}

export interface Expression {
  exprType: "column" | "value" | "string" | "literal" | "count";
}

export interface ColumnRefExpression extends Expression {
  exprType: "column";
  columnName: string;
  source: Source;
}

export interface ValueExpression extends Expression {
  exprType: "value";
  value: any;
}

