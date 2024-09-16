import type { TableInfo } from 'dbgate-types';
import _cloneDeep from 'lodash/cloneDeep';
import _fromPairs from 'lodash/fromPairs';
import _get from 'lodash/get';

export function prepareTableForImport(table: TableInfo): TableInfo {
  const res = _cloneDeep(table);
  res.foreignKeys = [];
  res.indexes = [];
  res.uniques = [];
  res.checks = [];
  if (res.primaryKey) res.primaryKey.constraintName = null;
  res.tableEngine = null;
  return res;
}

interface TransformColumnDefinition {
  src: string;
  dst: string;
}

export function transformRowUsingColumnMap(row, columns: TransformColumnDefinition[]) {
  return _fromPairs(columns.map(col => [col.dst, _get(row, col.src)]));
}
