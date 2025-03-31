import { DatabaseInfo, TableInfo } from 'dbgate-types';
import { extendDatabaseInfo } from './structureTools';
import _sortBy from 'lodash/sortBy';

function tableWeight(table: TableInfo, maxRowcount?: number) {
  let weight = 0;
  if (table.primaryKey) weight += 1;
  if (table.foreignKeys) weight += table.foreignKeys.length * 1;
  if (maxRowcount && table.tableRowCount) {
    const rowcount = parseInt(table.tableRowCount as string);
    if (rowcount > 0)
      weight +=
        Math.log(rowcount) * table.columns.length * (table.dependencies.length || 1) * (table.dependencies.length || 1);
  } else {
    if (table.columns) weight += table.columns.length * 2;
  }
  if (table.dependencies) weight += table.dependencies.length * 10;
  if (maxRowcount) return weight;
}

export function chooseTopTables(tables: TableInfo[], count: number) {
  const dbinfo: DatabaseInfo = {
    tables,
  } as DatabaseInfo;

  const extended = extendDatabaseInfo(dbinfo);

  const maxRowcount = Math.max(
    ...extended.tables
      .map(x => x.tableRowCount || 0)
      .map(x => parseInt(x as string))
      .filter(x => x > 0)
  );

  const sorted = _sortBy(
    _sortBy(extended.tables, x => `${x.schemaName}.${x.pureName}`),
    table => -tableWeight(table, maxRowcount)
  );

  return sorted.slice(0, count);
}
