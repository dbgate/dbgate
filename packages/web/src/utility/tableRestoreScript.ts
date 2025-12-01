import _ from 'lodash';
import { dumpSqlInsert, Insert } from 'dbgate-sqltree';
import { TableInfo, SqlDumper } from 'dbgate-types';

export function createTableRestoreScript(backupTable: TableInfo, originalTable: TableInfo, dmp: SqlDumper) {
  const bothColumns = _.intersection(
    backupTable.columns.map(x => x.columnName),
    originalTable.columns.map(x => x.columnName)
  );
  const keyColumns = _.intersection(
    originalTable.primaryKey?.columns?.map(x => x.columnName) || [],
    backupTable.columns.map(x => x.columnName)
  );
  const insert: Insert = {
    commandType: 'insert',
    targetTable: originalTable,
    fields: bothColumns.map(colName => ({
      targetColumn: colName,
      exprType: 'column',
      columnName: colName,
      source: { alias: 'bak' },
    })),
    whereNotExistsSource: { name: backupTable, alias: 'bak' },
    insertWhereNotExistsCondition: {
      conditionType: 'and',
      conditions: keyColumns.map(colName => ({
        conditionType: 'binary',
        operator: '=',
        left: {
          exprType: 'column',
          columnName: colName,
          source: { name: originalTable },
        },
        right: {
          exprType: 'column',
          columnName: colName,
          source: { alias: 'bak' },
        },
      })),
    },
  };

  dumpSqlInsert(dmp, insert);
  dmp.endCommand();
}
