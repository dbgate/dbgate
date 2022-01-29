import { TableInfo } from 'dbgate-types';
import _cloneDeep from 'lodash/cloneDeep';

export function prepareTableForImport(table: TableInfo): TableInfo {
  const res = _cloneDeep(table);
  res.foreignKeys = [];
  res.indexes = [];
  res.uniques = [];
  res.checks = [];
  if (res.primaryKey) res.primaryKey.constraintName = null;
  return res;
}
