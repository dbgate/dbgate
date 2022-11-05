import type { DictionaryDescription } from 'dbgate-datalib';
import type { ApplicationDefinition, TableInfo } from 'dbgate-types';
import _ from 'lodash';
import { apiCall } from './api';
import { filterAppsForDatabase, saveDbToApp } from './appTools';

function checkDescriptionColumns(columns: string[], table: TableInfo) {
  if (!columns?.length) return false;
  if (!columns.every(x => table.columns.find(y => y.columnName == x))) return false;
  if (table.primaryKey?.columns?.find(x => columns.includes(x.columnName))) return false;
  return true;
}

export function getDictionaryDescription(
  table: TableInfo,
  conid: string,
  database: string,
  apps: ApplicationDefinition[],
  connections,
  skipCheckSaved: boolean = false
): DictionaryDescription {
  const conn = connections?.find(x => x._id == conid);

  if (!conn) {
    return null;
  }

  const dbApps = filterAppsForDatabase(conn, database, apps);

  if (!dbApps) {
    return null;
  }

  const cached = _.flatten(dbApps.map(x => x.dictionaryDescriptions || [])).find(
    x => x.pureName == table.pureName && x.schemaName == table.schemaName
  );

  if (cached && (skipCheckSaved || checkDescriptionColumns(cached.columns, table))) {
    return cached;
  }

  const descColumn = table.columns.find(x => x?.dataType?.toLowerCase()?.includes('char'));
  if (descColumn) {
    return {
      columns: [descColumn.columnName],
      delimiter: null,
      expression: descColumn.columnName,
    };
  }

  return null;
}

export function parseDelimitedColumnList(columns): string[] {
  return _.compact((columns || '').split(',').map(x => x.trim()));
}

export function checkDescriptionExpression(expression: string, table: TableInfo) {
  if (!expression) return false;
  if (!table) return false;
  return checkDescriptionColumns(parseDelimitedColumnList(expression), table);
}

export function changeDelimitedColumnList(columns, columnName, isChecked) {
  const parsed = parseDelimitedColumnList(columns);
  const includes = parsed.includes(columnName);
  if (includes == isChecked) return columns;
  if (isChecked) parsed.push(columnName);
  else _.remove(parsed, x => x == columnName);
  return parsed.join(',');
}

export async function saveDictionaryDescription(
  table: TableInfo,
  conid: string,
  database: string,
  expression: string,
  delimiter: string,
  targetApplication: string
) {
  const appFolder = await saveDbToApp(conid, database, targetApplication);

  await apiCall('apps/save-dictionary-description', {
    appFolder,
    schemaName: table.schemaName,
    pureName: table.pureName,
    columns: parseDelimitedColumnList(expression),
    expression,
    delimiter,
  });
}
