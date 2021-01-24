import { TableInfo } from 'dbgate-types';
import uuidv1 from 'uuid/v1';

export function generateTableGroupId(table: TableInfo): TableInfo {
  if (!table) return table;
  if (!table.groupId) {
    return {
      ...table,
      columns: table.columns.map(col => ({
        ...col,
        groupid: uuidv1(),
      })),
      groupId: uuidv1(),
    };
  }
  return table;
}
