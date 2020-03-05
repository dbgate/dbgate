export interface SqlDialect {
  rangeSelect?: boolean;
  limitSelect?: boolean;
  offsetFetchRangeSyntax?: boolean;
  quoteIdentifier(s: string): string;
}
