export interface RangeDefinition {
  offset: number;
  limit: number;
}

export interface QueryResultColumn {
  columnName: string;
  notNull: boolean;
  autoIncrement?: boolean;
}

export interface QueryResult {
  rows?: any[];
  columns?: QueryResultColumn[];
  rowsAffected?: number;
}
