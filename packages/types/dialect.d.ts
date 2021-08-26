export interface SqlDialect {
  rangeSelect?: boolean;
  limitSelect?: boolean;
  ilike?: boolean;
  rowNumberOverPaging?: boolean;
  stringEscapeChar: string;
  offsetFetchRangeSyntax?: boolean;
  quoteIdentifier(s: string): string;
  fallbackDataType?: string;
  explicitDropConstraint?: boolean;
  anonymousPrimaryKey?: boolean;
  enableConstraintsPerTable?: boolean;
  dropColumnDependencies?: string[];
  changeColumnDependencies?: string[];
  nosql?: boolean; // mongo
}
