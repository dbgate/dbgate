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

  dropIndexContainsTableSpec?: boolean;

  createColumn?: boolean;
  dropColumn?: boolean;
  changeColumn?: boolean;
  createIndex?: boolean;
  dropIndex?: boolean;
  createForeignKey?: boolean;
  dropForeignKey?: boolean;
  createPrimaryKey?: boolean;
  dropPrimaryKey?: boolean;
  createUnique?: boolean;
  dropUnique?: boolean;
  createCheck?: boolean;
  dropCheck?: boolean;

  dropReferencesWhenDropTable?: boolean;
  disableExplicitTransaction?: boolean;
}
