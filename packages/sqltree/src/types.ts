import { NamedObjectInfo, RangeDefinition, TransformType } from '@dbgate/types';

// export interface Command {
// }

export interface Select {
  commandType: 'select';

  from: FromDefinition;

  columns?: ResultField[];
  topRecords?: number;
  range?: RangeDefinition;
  distinct?: boolean;
  selectAll?: boolean;
  orderBy?: OrderByExpression[];
  groupBy?: Expression[];
  where?: Condition;
}

export type UpdateField = Expression & { targetColumn: string };

export interface Update {
  commandType: 'update';
  fields: UpdateField[];
  from: FromDefinition;
  where?: Condition;
}

export interface Delete {
  commandType: 'delete';
  from: FromDefinition;
  where?: Condition;
}

export interface Insert {
  commandType: 'insert';
  fields: UpdateField[];
  targetTable: NamedObjectInfo;
}

export interface AllowIdentityInsert {
  commandType: 'allowIdentityInsert';
  targetTable: NamedObjectInfo;
  allow: boolean;
}

export type Command = Select | Update | Delete | Insert | AllowIdentityInsert;

// export interface Condition {
//   conditionType: "eq" | "not" | "binary";
// }

export interface UnaryCondition {
  expr: Expression;
}

export interface BinaryCondition {
  conditionType: 'binary';
  operator: '=' | '!=' | '<' | '>' | '>=' | '<=';
  left: Expression;
  right: Expression;
}

export interface LikeCondition {
  conditionType: 'like' | 'notLike';
  left: Expression;
  right: Expression;
}

export interface NotCondition {
  conditionType: 'not';
  condition: Condition;
}

export interface TestCondition extends UnaryCondition {
  conditionType: 'isNull' | 'isNotNull' | 'isEmpty' | 'isNotEmpty';
}

export interface CompoudCondition {
  conditionType: 'and' | 'or';
  conditions: Condition[];
}

export type Condition = BinaryCondition | NotCondition | TestCondition | CompoudCondition | LikeCondition;

export interface Source {
  name?: NamedObjectInfo;
  alias?: string;
  subQuery?: Select;
  subQueryString?: string;
}

export type JoinType = 'LEFT JOIN' | 'INNER JOIN' | 'RIGHT JOIN';

export type Relation = Source & {
  conditions: Condition[];
  joinType: JoinType;
};
export type FromDefinition = Source & { relations?: Relation[] };

// export interface Expression {
//   exprType: "column" | "value" | "string" | "literal" | "count";
// }

export interface ColumnRefExpression {
  exprType: 'column';
  columnName: string;
  source?: Source;
}

export interface ValueExpression {
  exprType: 'value';
  value: any;
}

export interface PlaceholderExpression {
  exprType: 'placeholder';
}

export interface RawExpression {
  exprType: 'raw';
  sql: string;
}

export interface CallExpression {
  exprType: 'call';
  func: string;
  args: Expression[];
  argsPrefix?: string; // DISTINCT in case of COUNT DISTINCT
}

export interface TranformExpression {
  exprType: 'transform';
  expr: Expression;
  transform: TransformType;
}

export type Expression =
  | ColumnRefExpression
  | ValueExpression
  | PlaceholderExpression
  | RawExpression
  | CallExpression
  | TranformExpression;
export type OrderByExpression = Expression & { direction: 'ASC' | 'DESC' };

export type ResultField = Expression & { alias?: string };
