import { findForeignKeyForColumn } from 'dbgate-tools';
import { DatabaseInfo, TableInfo, ViewInfo } from 'dbgate-types';

export function getPerspectiveDefaultColumns(
  table: TableInfo | ViewInfo,
  db: DatabaseInfo,
  circularColumns: string[]
): string[] {
  const columns = table.columns.map(x => x.columnName);
  const predicates = [
    x => x.toLowerCase() == 'name',
    x => x.toLowerCase() == 'title',
    x => x.toLowerCase().includes('name'),
    x => x.toLowerCase().includes('title'),
    x => x.dataType?.toLowerCase()?.includes('char'),
    x => findForeignKeyForColumn(table as TableInfo, x)?.columns?.length == 1 && !circularColumns.includes(x),
    x => findForeignKeyForColumn(table as TableInfo, x)?.columns?.length == 1,
  ];

  for (const predicate of predicates) {
    const col = columns.find(predicate);
    if (col) return [col];
  }

  return [columns[0]];
}
