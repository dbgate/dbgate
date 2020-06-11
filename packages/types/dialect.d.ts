export interface SqlDialect {
  rangeSelect?: boolean;
  limitSelect?: boolean;
  stringEscapeChar: string;
  offsetFetchRangeSyntax?: boolean;
  quoteIdentifier(s: string): string;
  fallbackDataType?: string;
}
