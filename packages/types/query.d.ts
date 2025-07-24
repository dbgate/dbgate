export interface RangeDefinition {
  offset: number;
  limit: number;
}

export interface QueryResultColumn {
  columnName: string;
  notNull: boolean;
  autoIncrement?: boolean;
  dataType?: string;
}

export interface QueryResult {
  rows?: any[];
  columns?: QueryResultColumn[];
  rowsAffected?: number;
}

export type LeftOperand = {
  exprType: 'placeholder' | 'column';
  columnName?: string;
};

export type RightOperand = {
  exprType: 'value';
  value: any;
};

export type BinaryCondition = {
  conditionType: 'binary';
  operator: '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=';
  left: LeftOperand;
  right: RightOperand;
};

export type AndCondition = {
  conditionType: 'and';
  conditions: FilterCondition[];
};

export type OrCondition = {
  conditionType: 'or';
  conditions: FilterCondition[];
};

export type NullCondition = {
  conditionType: 'isNull' | 'isNotNull';
  expr: LeftOperand;
};

export type NotCondition = {
  conditionType: 'not';
  condition: FilterCondition;
};

export type LikeCondition = {
  conditionType: 'like';
  left: LeftOperand;
  right: RightOperand;
};

export type PredicateCondition = {
  conditionType: 'specificPredicate';
  predicate: 'exists' | 'notExists' | 'emptyArray' | 'notEmptyArray';
  expr: LeftOperand;
};

export type InCondition = {
  conditionType: 'in';
  expr: LeftOperand;
  values: any[];
};

export type FilterCondition =
  | BinaryCondition
  | AndCondition
  | OrCondition
  | NullCondition
  | NotCondition
  | LikeCondition
  | PredicateCondition
  | InCondition;

export type SortItem = {
  columnName: string;
  direction?: 'ASC' | 'DESC';
};

export type AggregateColumn = {
  aggregateFunction: 'count' | 'sum' | 'avg' | 'min' | 'max';
  columnArgument?: string;
  alias: string;
};

export type CollectionAggregate = {
  condition?: FilterCondition;
  groupByColumns: string[];
  aggregateColumns: AggregateColumn[];
};

export type FullQueryOptions = {
  condition?: FilterCondition;
  sort?: SortItem[];
  limit?: number;
  skip?: number;
};
