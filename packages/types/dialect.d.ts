export interface SqlDialect {
  rangeSelect?: boolean;
  limitSelect?: boolean;
  ilike?: boolean;
  rowNumberOverPaging?: boolean;
  topRecords?: boolean;
  stringEscapeChar: string;
  offsetFetchRangeSyntax?: boolean;
  quoteIdentifier(s: string): string;
  fallbackDataType?: string;
  explicitDropConstraint?: boolean;
  anonymousPrimaryKey?: boolean;
  defaultSchemaName?: string;
  enableConstraintsPerTable?: boolean;
  requireStandaloneSelectForScopeIdentity?: boolean;
  allowMultipleValuesInsert?: boolean;

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

  // syntax for create column: ALTER TABLE table ADD COLUMN column
  createColumnWithColumnKeyword?: boolean;

  dropReferencesWhenDropTable?: boolean;
  requireFromDual?: boolean;

  predefinedDataTypes: string[];

  // create sql-tree expression
  createColumnViewExpression(columnName: string, dataType: string, source: { alias: string }, alias?: string): any;

  getTableFormOptions(intent: 'newTableForm' | 'editTableForm' | 'sqlCreateTable' | 'sqlAlterTable'): {
    name: string;
    sqlFormatString: string;
  }[];
}
