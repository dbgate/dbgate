import { TableInfo } from 'dbgate-types';
import _ from 'lodash';

export function prepareTableForImport(table: TableInfo): TableInfo {
  const res = _.cloneDeep(table);
  res.foreignKeys = [];
  if (res.primaryKey) res.primaryKey.constraintName = null;
  return res;
}
