import { DictionaryDescription } from 'dbgate-datalib';
import { TableInfo } from 'dbgate-types';
import _ from 'lodash';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from './storageCache';

function checkDescriptionColumns(columns: string[], table: TableInfo) {
  return columns.length > 0 && columns.every(x => table.columns.find(y => y.columnName == x));
}

export function getDictionaryDescription(
  table: TableInfo,
  conid: string,
  database: string,
  skipCheckSaved: boolean = false
): DictionaryDescription {
  const keySpecific = `dictionary_spec_${table.schemaName}||${table.pureName}||${conid}||${database}`;
  const keyCommon = `dictionary_spec_${table.schemaName}||${table.pureName}`;

  const cachedSpecific = getLocalStorage(keySpecific);
  const cachedCommon = getLocalStorage(keyCommon);

  if (cachedSpecific && (skipCheckSaved || checkDescriptionColumns(cachedSpecific.columns, table)))
    return cachedSpecific;
  if (cachedCommon && (skipCheckSaved || checkDescriptionColumns(cachedCommon.columns, table))) return cachedCommon;

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

export function saveDictionaryDescription(
  table: TableInfo,
  conid: string,
  database: string,
  expression: string,
  delimiter: string,
  useForAllDatabases: boolean
) {
  const keySpecific = `dictionary_spec_${table.schemaName}||${table.pureName}||${conid}||${database}`;
  const keyCommon = `dictionary_spec_${table.schemaName}||${table.pureName}`;

  removeLocalStorage(keySpecific);
  if (useForAllDatabases) removeLocalStorage(keyCommon);

  const description = {
    columns: parseDelimitedColumnList(expression),
    expression,
    delimiter,
  };

  if (useForAllDatabases) {
    setLocalStorage(keyCommon, description);
  } else {
    setLocalStorage(keySpecific, description);
  }
}
