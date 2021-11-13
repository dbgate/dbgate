import { TableInfo } from 'dbgate-types';
import _ from 'lodash';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from './storageCache';

interface DictionaryDescription {
  expression: string;
  columns: string[];
  delimiter: string;
}

function checkDescription(desc: DictionaryDescription, table: TableInfo) {
  return desc.columns.length > 0 && desc.columns.every(x => table.columns.find(y => y.columnName == x));
}

export function getDictionaryDescription(table: TableInfo, conid: string, database: string): DictionaryDescription {
  const keySpecific = `dictionary_spec_${table.schemaName}||${table.pureName}||${conid}||${database}`;
  const keyCommon = `dictionary_spec_${table.schemaName}||${table.pureName}`;

  const cachedSpecific = getLocalStorage(keySpecific);
  const cachedCommon = getLocalStorage(keyCommon);

  if (cachedSpecific && checkDescription(cachedSpecific, table)) return cachedSpecific;
  if (cachedCommon && checkDescription(cachedCommon, table)) return cachedCommon;

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

export function parseDelimitedColumnList(columns) {
  return _.compact((columns || '').split(',').map(x => x.trim()));
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
