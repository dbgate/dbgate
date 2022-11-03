import type { Select } from 'dbgate-sqltree';
import type { EngineDriver } from 'dbgate-types';
import _ from 'lodash';
import { apiCall } from '../utility/api';

export async function loadChartStructure(driver: EngineDriver, conid, database, sql) {
  const select: Select = {
    commandType: 'select',
    selectAll: true,
    topRecords: 1,
    from: {
      subQueryString: sql,
      alias: 'subq',
    },
  };

  const resp = await apiCall('database-connections/sql-select', { conid, database, select });
  if (resp.errorMessage) throw new Error(resp.errorMessage);
  return resp.columns.map(x => x.columnName);
}

export async function loadChartData(driver: EngineDriver, conid, database, sql, config) {
  const dataColumns = extractDataColumns(config);
  const { labelColumn, truncateFrom, truncateLimit, showRelativeValues } = config;
  if (!labelColumn || !dataColumns || dataColumns.length == 0) return null;

  const select: Select = {
    commandType: 'select',

    columns: [
      {
        exprType: 'column',
        source: { alias: 'subq' },
        columnName: labelColumn,
        alias: labelColumn,
      },
      // @ts-ignore
      ...dataColumns.map(columnName => ({
        exprType: 'call',
        func: 'SUM',
        args: [
          {
            exprType: 'column',
            columnName,
            source: { alias: 'subq' },
          },
        ],
        alias: columnName,
      })),
    ],
    topRecords: truncateLimit || 100,
    from: {
      subQueryString: sql,
      alias: 'subq',
    },
    groupBy: [
      {
        exprType: 'column',
        source: { alias: 'subq' },
        columnName: labelColumn,
      },
    ],
    orderBy: [
      {
        exprType: 'column',
        source: { alias: 'subq' },
        columnName: labelColumn,
        direction: truncateFrom == 'end' ? 'DESC' : 'ASC',
      },
    ],
  };

  const resp = await apiCall('database-connections/sql-select', { conid, database, select });
  let { rows, columns, errorMessage } = resp;
  if (errorMessage) {
    throw new Error(errorMessage);
  }
  if (truncateFrom == 'end' && rows) {
    rows = _.reverse([...rows]);
  }
  if (showRelativeValues) {
    const maxValues = dataColumns.map(col => _.max(rows.map(row => row[col])));
    for (const [col, max] of _.zip(dataColumns, maxValues)) {
      if (!max) continue;
      if (!_.isNumber(max)) continue;
      if (!(max > 0)) continue;
      rows = rows.map(row => ({
        ...row,
        [col]: (row[col] / max) * 100,
      }));
      // columns = columns.map((x) => {
      //   if (x.columnName == col) {
      //     return { columnName: `${col} %` };
      //   }
      //   return x;
      // });
    }
  }

  console.log('Loaded chart data', { columns, rows });

  return {
    columns,
    rows,
  };
}

export function extractDataColumns(values) {
  const dataColumns = [];
  for (const key in values) {
    if (key.startsWith('dataColumn_') && values[key]) {
      dataColumns.push(key.substring('dataColumn_'.length));
    }
  }
  return dataColumns;
}
export function extractDataColumnColors(values, dataColumns) {
  const res = {};
  for (const column of dataColumns) {
    const color = values[`dataColumnColor_${column}`];
    if (color) res[column] = color;
  }
  return res;
}

export function extractDataColumnLabels(values, dataColumns) {
  const res = {};
  for (const column of dataColumns) {
    const label = values[`dataColumnLabel_${column}`];
    if (label) res[column] = label;
  }
  return res;
}
