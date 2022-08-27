import { findForeignKeyForColumn } from 'dbgate-tools';
import { DatabaseInfo, TableInfo, ViewInfo } from 'dbgate-types';
import { MultipleDatabaseInfo, PerspectiveConfig } from './PerspectiveConfig';

function getPerspectiveDefaultColumns(
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
    x => x.toLowerCase().includes('subject'),
    // x => x.toLowerCase().includes('text'),
    // x => x.toLowerCase().includes('desc'),
    x =>
      table.columns
        .find(y => y.columnName == x)
        ?.dataType?.toLowerCase()
        ?.includes('char'),
    x => findForeignKeyForColumn(table as TableInfo, x)?.columns?.length == 1 && !circularColumns.includes(x),
    x => findForeignKeyForColumn(table as TableInfo, x)?.columns?.length == 1,
  ];

  for (const predicate of predicates) {
    const col = columns.find(predicate);
    if (col) return [col];
  }

  return [columns[0]];
}

export function processPerspectiveDefaultColunns(
  config: PerspectiveConfig,
  dbInfos: MultipleDatabaseInfo,
  conid: string,
  database: string
) {
  for (const node of config.nodes) {
    if (node.defaultColumnsProcessed) continue;

    const db = dbInfos?.[conid]?.[database];
    if (!db) continue;

    const table = db.tables.find(x => x.pureName == node.pureName && x.schemaName == node.schemaName);
    const view = db.views.find(x => x.pureName == node.pureName && x.schemaName == node.schemaName);

    if (table || view) {
      const defaultColumns = getPerspectiveDefaultColumns(table || view, db, []);
      const newConfig = {
        ...config,
        nodes: config.nodes.map(n =>
          n.designerId == node.designerId
            ? {
                ...n,
                defaultColumnsProcessed: true,
                checkedColumns: defaultColumns,
              }
            : n
        ),
      };

      return newConfig;
    }
  }

  return null;
}
