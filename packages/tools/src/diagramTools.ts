import { DatabaseInfo, TableInfo } from 'dbgate-types';
import { extendDatabaseInfo } from './structureTools';
import _sortBy from 'lodash/sortBy';
import { filterName } from './filterName';

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

export function chooseTopTables(tables: TableInfo[], count: number, tableFilter: string, omitTablesFilter: string) {
  const filteredTables = tables.filter(table => {
    if (tableFilter) {
      if (!filterName(tableFilter, table?.pureName)) return false;
    }
    if (omitTablesFilter) {
      if (filterName(omitTablesFilter, table?.pureName)) return false;
    }
    return true;
  });

  if (!(count > 0)) {
    return filteredTables;
  }

  const dbinfo: DatabaseInfo = {
    tables: filteredTables,
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

export const DIAGRAM_ZOOMS = [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.25, 1.5, 1.75, 2];
