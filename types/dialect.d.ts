export interface SqlDialect {
  rangeSelect?: boolean;
  limitSelect?: boolean;
  quoteIdentifier(s: string): string;
}
