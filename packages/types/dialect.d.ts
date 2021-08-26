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
  nosql?: boolean; // mongo

  dropColumnDependencies?: string[];
  changeColumnDependencies?: string[];

  createColumn?: boolean;
  dropColumn?: boolean;
  createIndex?: boolean;
  dropIndex?: boolean;
  createForeignKey?: boolean;
  dropForeignKey?: boolean;
  createPrimaryKey?: boolean;
  dropPrimaryKey?: boolean;
}
