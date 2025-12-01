import _ from 'lodash';
import { Condition, dumpSqlInsert, dumpSqlUpdate, Insert, Update, Delete, dumpSqlDelete } from 'dbgate-sqltree';
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
  const valueColumns = _.difference(bothColumns, keyColumns);

  function makeColumnCond(colName: string, operator: '=' | '<>' | '<' | '>' | '<=' | '>=' = '='): Condition {
    return {
      conditionType: 'binary',
      operator,
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
    };
  }

  function putTitle(title: string) {
    dmp.putRaw('\n\n');
    dmp.comment(`******************** ${title} ********************`);
    dmp.putRaw('\n');
  }

  dmp.comment(`Restoring data into table ${originalTable.pureName} from backup table ${backupTable.pureName}`);
  dmp.putRaw('\n');
  dmp.comment(`Key columns: ${keyColumns.join(', ')}`);
  dmp.putRaw('\n');
  dmp.comment(`Value columns: ${valueColumns.join(', ')}`);
  dmp.putRaw('\n');
  dmp.comment(`Follows UPDATE, DELETE, INSERT statements to restore data`);
  dmp.putRaw('\n');

  const update: Update = {
    commandType: 'update',
    from: { name: originalTable },
    fields: valueColumns.map(colName => ({
      exprType: 'select',
      select: {
        commandType: 'select',
        from: { name: backupTable, alias: 'bak' },
        columns: [
          {
            exprType: 'column',
            columnName: colName,
            source: { alias: 'bak' },
          },
        ],
        where: {
          conditionType: 'and',
          conditions: keyColumns.map(colName => makeColumnCond(colName)),
        },
      },
      targetColumn: colName,
    })),
    where: {
      conditionType: 'exists',
      subQuery: {
        commandType: 'select',
        from: { name: backupTable, alias: 'bak' },
        selectAll: true,
        where: {
          conditionType: 'and',
          conditions: [
            ...keyColumns.map(keyColName => makeColumnCond(keyColName)),
            {
              conditionType: 'or',
              conditions: valueColumns.map(colName => makeColumnCond(colName, '<>')),
            },
          ],
        },
      },
    },
  };
  putTitle('UPDATE');
  dumpSqlUpdate(dmp, update);
  dmp.endCommand();

  const delcmd: Delete = {
    commandType: 'delete',
    from: { name: originalTable },
    where: {
      conditionType: 'notExists',
      subQuery: {
        commandType: 'select',
        from: { name: backupTable, alias: 'bak' },
        selectAll: true,
        where: {
          conditionType: 'and',
          conditions: keyColumns.map(colName => makeColumnCond(colName)),
        },
      },
    },
  };
  putTitle('DELETE');
  dumpSqlDelete(dmp, delcmd);
  dmp.endCommand();

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
      conditions: keyColumns.map(colName => makeColumnCond(colName)),
    },
  };

  putTitle('INSERT');
  dumpSqlInsert(dmp, insert);
  dmp.endCommand();
}
