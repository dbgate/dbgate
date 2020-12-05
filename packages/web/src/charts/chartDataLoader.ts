import { dumpSqlSelect, Select } from 'dbgate-sqltree';
import { EngineDriver } from 'dbgate-types';
import axios from '../utility/axios';
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
  return resp.data.columns.map((x) => x.columnName);
}

export async function loadChartData(driver: EngineDriver, conid, database, sql, config) {
  const dataColumns = extractDataColumns(config);
  const { labelColumn } = config;
  if (!labelColumn || !dataColumns || dataColumns.length == 0) return null;

  const select: Select = {
    commandType: 'select',
    // columns:[
    //     {
    //         exprType:'call',
    //         func:'SUM',
    //         args: [
    //             {
    //                 exprType: 'column',
    //                 columnName,
    //                 source: { alias: 'subq' },
    //             }
    //         ]
    //     }
    // ],

    columns: [
      {
        exprType: 'column',
        source: { alias: 'subq' },
        columnName: labelColumn,
        alias: labelColumn,
      },
      // @ts-ignore
      ...dataColumns.map((columnName) => ({
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
    topRecords: 500,
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
  };

  const dmp = driver.createDumper();
  dumpSqlSelect(dmp, select);
  const resp = await axios.post('database-connections/query-data', { conid, database, sql: dmp.s });
  return resp.data;
}
