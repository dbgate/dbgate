import { ColumnInfo } from './dbinfo';

export interface SqlDialect {
  rangeSelect?: boolean;
  limitSelect?: boolean;
  ilike?: boolean;
  rowNumberOverPaging?: boolean;
  topRecords?: boolean;
  stringEscapeChar: string;
  offsetFetchRangeSyntax?: boolean;
  offsetNotSupported?: boolean;
  quoteIdentifier(s: string): string;
  fallbackDataType?: string;
  explicitDropConstraint?: boolean;
  anonymousPrimaryKey?: boolean;
  anonymousForeignKey?: boolean;
  defaultSchemaName?: string;
  enableConstraintsPerTable?: boolean;
  enableAllForeignKeys?: boolean;
  enableForeignKeyChecks?: boolean;
  requireStandaloneSelectForScopeIdentity?: boolean;
  allowMultipleValuesInsert?: boolean;

  dropColumnDependencies?: string[];
  changeColumnDependencies?: string[];
  renameColumnDependencies?: string[];

  dropIndexContainsTableSpec?: boolean;

  createColumn?: boolean;
  dropColumn?: boolean;
  changeColumn?: boolean;
  changeAutoIncrement?: boolean;
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
  renameSqlObject?: boolean;
  multipleSchema?: boolean;
  filteredIndexes?: boolean;
  namedDefaultConstraint?: boolean;

  specificNullabilityImplementation?: boolean;
  omitForeignKeys?: boolean;
  omitUniqueConstraints?: boolean;
  omitIndexes?: boolean;
  omitTableAliases?: boolean;
  omitTableBeforeColumn?: boolean;
  disableAutoIncrement?: boolean;
  disableNonPrimaryKeyRename?: boolean;
  disableRenameTable?: boolean;
  defaultNewTableColumns?: ColumnInfo[];
  sortingKeys?: boolean;
  generateDefaultValueForUuid?: string;

  // syntax for create column: ALTER TABLE table ADD COLUMN column
  createColumnWithColumnKeyword?: boolean;

  dropReferencesWhenDropTable?: boolean;
  requireFromDual?: boolean;
  userDatabaseNamePrefix?: string; // c## in Oracle
  upperCaseAllDbObjectNames?: boolean;
  defaultValueBeforeNullability?: boolean;

  predefinedDataTypes: string[];

  // create sql-tree expression
  createColumnViewExpression(
    columnName: string,
    dataType: string,
    source: { alias: string },
    alias?: string,
    purpose: 'view' | 'filter' = 'view'
  ): any;

  getTableFormOptions(intent: 'newTableForm' | 'editTableForm' | 'sqlCreateTable' | 'sqlAlterTable'): {
    name: string;
    sqlFormatString: string;
    disabled?: boolean;
    allowEmptyValue?: boolean;
  }[];
}
