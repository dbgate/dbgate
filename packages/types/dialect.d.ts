export interface SqlDialect {
  rangeSelect?: boolean;
  limitSelect?: boolean;
  stringEscapeChar: string;
  offsetFetchRangeSyntax?: boolean;
  quoteIdentifier(s: string): string;
  fallbackDataType?: string;
  explicitDropConstraint?: boolean;
  anonymousPrimaryKey?: boolean;
  enableConstraintsPerTable?: boolean;
  nosql?: boolean; // mongo
}
