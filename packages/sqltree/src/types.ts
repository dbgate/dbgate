import type { NamedObjectInfo, RangeDefinition, TransformType } from 'dbgate-types';

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
  having?: Condition;
}

export type UpdateField = Expression & { targetColumn: string };

export interface Update {
  commandType: 'update';
  fields: UpdateField[];
  from: FromDefinition;
  where?: Condition;
  // ALTER TABLE xxx UPDATE col1=val1 - syntax for ClickHouse
  alterTableUpdateSyntax?: boolean;
}

export interface Delete {
  commandType: 'delete';
  from: FromDefinition;
  where?: Condition;

  // ALTER TABLE xxx DELETE  - syntax for ClickHouse
  alterTableDeleteSyntax?: boolean;
}

export interface Insert {
  commandType: 'insert';
  fields: UpdateField[];
  targetTable: NamedObjectInfo;
  insertWhereNotExistsCondition?: Condition;
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

export interface ExpressionCondition extends UnaryCondition {
  // not in standard SQL
  conditionType: 'expression';
}

export interface BinaryCondition {
  conditionType: 'binary';
  operator: '=' | '!=' | '<>' | '<' | '>' | '>=' | '<=';
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

export interface SpecificPredicateCondition extends UnaryCondition {
  conditionType: 'specificPredicate';
  predicate: string;
}

export interface CompoudCondition {
  conditionType: 'and' | 'or';
  conditions: Condition[];
}

export interface ExistsCondition {
  conditionType: 'exists';
  subQuery: Select;
}
export interface NotExistsCondition {
  conditionType: 'notExists';
  subQuery: Select;
}

export interface BetweenCondition {
  conditionType: 'between';
  expr: Expression;
  left: Expression;
  right: Expression;
}

export interface InCondition {
  conditionType: 'in';
  expr: Expression;
  values: any[];
}

export interface NotInCondition {
  conditionType: 'notIn';
  expr: Expression;
  values: any[];
}

export interface RawTemplateCondition {
  conditionType: 'rawTemplate';
  templateSql: string;
  expr: Expression;
}

export interface AnyColumnPassEvalOnlyCondition {
  conditionType: 'anyColumnPass';
  placeholderCondition: Condition;
}

export type Condition =
  | BinaryCondition
  | NotCondition
  | TestCondition
  | CompoudCondition
  | LikeCondition
  | ExistsCondition
  | NotExistsCondition
  | BetweenCondition
  | InCondition
  | NotInCondition
  | RawTemplateCondition
  | AnyColumnPassEvalOnlyCondition
  | SpecificPredicateCondition
  | ExpressionCondition;

export interface Source {
  name?: NamedObjectInfo;
  alias?: string;
  subQuery?: Select;
  subQueryString?: string;
}

export type JoinType = 'LEFT JOIN' | 'INNER JOIN' | 'RIGHT JOIN' | 'CROSS JOIN';

export type Relation = Source & {
  conditions?: Condition[];
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
  dataType?: string;
}

export interface PlaceholderExpression {
  exprType: 'placeholder';
}

export interface RawExpression {
  exprType: 'raw';
  sql: string;
}

export interface UnaryRawExpression {
  exprType: 'unaryRaw';
  expr: Expression;
  beforeSql?: string;
  afterSql?: string;
}

export interface CallExpression {
  exprType: 'call';
  func: string;
  args: Expression[];
  argsPrefix?: string; // DISTINCT in case of COUNT DISTINCT
}

export interface MethodCallExpression {
  exprType: 'methodCall';
  method: string;
  args: Expression[];
  thisObject: Expression;
}

export interface TranformExpression {
  exprType: 'transform';
  expr: Expression;
  transform: TransformType;
}

export interface RowNumberExpression {
  exprType: 'rowNumber';
  orderBy: OrderByExpression[];
}

export type Expression =
  | ColumnRefExpression
  | ValueExpression
  | PlaceholderExpression
  | RawExpression
  | UnaryRawExpression
  | CallExpression
  | MethodCallExpression
  | TranformExpression
  | RowNumberExpression;
export type OrderByExpression = Expression & { direction: 'ASC' | 'DESC' };

export type ResultField = Expression & { alias?: string };
