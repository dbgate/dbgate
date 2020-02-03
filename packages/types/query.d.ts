export interface RangeDefinition {
  offset: number;
  limit: number;
}

export interface QueryResultColumn {
  name: string;
}

export interface QueryResult {
  rows: any[];
  columns: QueryResultColumn[];
}
