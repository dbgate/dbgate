import _ from 'lodash';
import { ChangeSetFieldDefinition, ChangeSetRowDefinition } from './ChangeSet';
import { DisplayColumn } from './GridDisplay';
import { DatabaseInfo, QueryResultColumn, TableInfo } from 'dbgate-types';

export interface QueryResultTableMapping {
  pureName: string;
  schemaName?: string;
  keyColumns: string[];
  keyDisplayColumns: { displayName: string; sourceColumnName: string }[];
}

export interface QueryResultColumnBaseMapping {
  pureName: string;
  schemaName?: string;
  sourceColumnName: string;
}

export function getTableKey(schemaName: string, pureName: string) {
  return `${schemaName || ''}\n${pureName}`;
}

function namesEqual(left: string, right: string) {
  return left != null && right != null && left.toLowerCase() == right.toLowerCase();
}

function findTable(dbinfo: DatabaseInfo, schemaName: string, pureName: string): TableInfo {
  if (!dbinfo?.tables) return null;
  if (schemaName) {
    const schemaTable =
      dbinfo.tables.find(table => table.schemaName == schemaName && table.pureName == pureName) ||
      dbinfo.tables.find(table => namesEqual(table.schemaName, schemaName) && namesEqual(table.pureName, pureName));
    if (schemaTable) return schemaTable;
    const uniqueNameTables = dbinfo.tables.filter(table => namesEqual(table.pureName, pureName));
    return uniqueNameTables.length == 1 ? uniqueNameTables[0] : null;
  }
  const tables = dbinfo.tables.filter(table => table.pureName == pureName);
  if (tables.length == 1) return tables[0];
  const matchingTables = dbinfo.tables.filter(table => namesEqual(table.pureName, pureName));
  return matchingTables.length == 1 ? matchingTables[0] : null;
}

function findColumnName(table: TableInfo, columnName: string) {
  if (!columnName) return columnName;
  const exactColumn = table?.columns?.find(column => column.columnName == columnName);
  if (exactColumn) return exactColumn.columnName;
  const matchingColumns = table?.columns?.filter(column => namesEqual(column.columnName, columnName)) || [];
  return matchingColumns.length == 1 ? matchingColumns[0].columnName : columnName;
}

export function createEditableQueryResultMappings(columns: QueryResultColumn[], dbinfo: DatabaseInfo) {
  const editableColumns = new Set<string>();
  const tableMappings: { [key: string]: QueryResultTableMapping } = {};
  const columnBaseMappings: { [columnName: string]: QueryResultColumnBaseMapping } = {};
  const groups = _.groupBy(
    (columns || []).filter(column => column.tableName && column.sourceColumnName),
    column => getTableKey(column.tableSchema, column.tableName)
  );

  for (const groupColumns of Object.values(groups)) {
    const firstColumn = groupColumns[0];
    const table = findTable(dbinfo, firstColumn.tableSchema, firstColumn.tableName);
    const tableSchema = table ? table.schemaName : firstColumn.tableSchema;
    const tableName = table?.pureName || firstColumn.tableName;
    const normalizedColumns = groupColumns.map(column => ({
      ...column,
      sourceColumnName: findColumnName(table, column.sourceColumnName),
    }));
    const sourceToDisplay = new Map(normalizedColumns.map(column => [column.sourceColumnName, column.columnName]));
    const primaryKeyColumns =
      table?.primaryKey?.columns?.map(column => column.columnName) ||
      normalizedColumns.filter(column => column.isPrimaryKey).map(column => column.sourceColumnName);
    const keyColumns =
      primaryKeyColumns.length > 0 && primaryKeyColumns.every(columnName => sourceToDisplay.has(columnName))
        ? primaryKeyColumns
        : [];
    if (keyColumns.length == 0) continue;

    const mapping = {
      pureName: tableName,
      schemaName: tableSchema,
      keyColumns,
      keyDisplayColumns: keyColumns.map(sourceColumnName => ({
        sourceColumnName,
        displayName: sourceToDisplay.get(sourceColumnName),
      })),
    };
    tableMappings[getTableKey(tableSchema, tableName)] = mapping;

    for (const column of normalizedColumns) {
      editableColumns.add(column.columnName);
      columnBaseMappings[column.columnName] = {
        pureName: tableName,
        schemaName: tableSchema,
        sourceColumnName: column.sourceColumnName,
      };
    }
  }

  return { editableColumns, tableMappings, columnBaseMappings };
}

export function hasCompleteQueryResultKey(mapping: QueryResultTableMapping, row: any) {
  return mapping.keyDisplayColumns.every(keyColumn => {
    const value = row?.[keyColumn.displayName];
    return value !== null && value !== undefined;
  });
}

function getQueryResultCondition(mapping: QueryResultTableMapping, row: any) {
  const condition = {};
  for (const keyColumn of mapping.keyDisplayColumns) {
    condition[keyColumn.sourceColumnName] = row?.[keyColumn.displayName];
  }
  return condition;
}

export function isEditableQueryResultColumn(
  columns: DisplayColumn[],
  tableMappings: { [key: string]: QueryResultTableMapping },
  uniqueName: string,
  row?: any
) {
  const col = columns.find(column => column.uniqueName == uniqueName);
  if (!col?.queryResultEditable) return false;
  const mapping = tableMappings[getTableKey(col.schemaName, col.pureName)];
  return !!mapping && hasCompleteQueryResultKey(mapping, row);
}

export function getEditableQueryResultChangeSetField(
  columns: DisplayColumn[],
  tableMappings: { [key: string]: QueryResultTableMapping },
  row: any,
  uniqueName: string,
  insertedRowIndex,
  existingRowIndex = null
): ChangeSetFieldDefinition {
  if (insertedRowIndex != null || !isEditableQueryResultColumn(columns, tableMappings, uniqueName, row)) return null;
  const col = columns.find(column => column.uniqueName == uniqueName);
  if (!col) return null;
  const mapping = tableMappings[getTableKey(col.schemaName, col.pureName)];
  if (!mapping) return null;
  if (!hasCompleteQueryResultKey(mapping, row)) return null;
  const condition = getQueryResultCondition(mapping, row);
  if (_.isEmpty(condition)) return null;
  return {
    pureName: mapping.pureName,
    schemaName: mapping.schemaName,
    existingRowIndex,
    condition,
    uniqueName,
    columnName: col.sourceColumnName,
  };
}

export function getEditableQueryResultChangeSetRowDefinitions(
  tableMappings: { [key: string]: QueryResultTableMapping },
  row: any,
  insertedRowIndex,
  existingRowIndex
): ChangeSetRowDefinition[] {
  if (insertedRowIndex != null) return [];
  return Object.values(tableMappings)
    .filter(mapping => hasCompleteQueryResultKey(mapping, row))
    .map(mapping => {
      return {
        pureName: mapping.pureName,
        schemaName: mapping.schemaName,
        existingRowIndex,
        condition: getQueryResultCondition(mapping, row),
      };
    });
}
