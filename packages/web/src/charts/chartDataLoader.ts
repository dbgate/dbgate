import { dumpSqlSelect, Select } from 'dbgate-sqltree';
import { EngineDriver } from 'dbgate-types';
import axios from '../utility/axios';
import _ from 'lodash';
import { extractDataColumns } from './DataChart';

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

  const dmp = driver.createDumper();
  dumpSqlSelect(dmp, select);
  const resp = await axios.post('database-connections/query-data', { conid, database, sql: dmp.s });
  if (resp.data.errorMessage) throw new Error(resp.data.errorMessage);
  return resp.data.columns.map(x => x.columnName);
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

  const dmp = driver.createDumper();
  dumpSqlSelect(dmp, select);
  const resp = await axios.post('database-connections/query-data', { conid, database, sql: dmp.s });
  let { rows, columns } = resp.data;
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
  return {
    columns,
    rows,
  };
}
