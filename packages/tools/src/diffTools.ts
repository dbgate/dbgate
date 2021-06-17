import { ColumnInfo, TableInfo } from 'dbgate-types';
import uuidv1 from 'uuid/v1';

export function generateTablePairingId(table: TableInfo): TableInfo {
  if (!table) return table;
  if (!table.pairingId) {
    return {
      ...table,
      columns: table.columns.map(col => ({
        ...col,
        pairingId: col.pairingId || uuidv1(),
      })),
      pairingId: table.pairingId || uuidv1(),
    };
  }
  return table;
}

function processPrimaryKey(table: TableInfo, oldColumn: ColumnInfo, newColumn: ColumnInfo) {
  if (!oldColumn?.isPrimaryKey && newColumn?.isPrimaryKey) {
    if (!table.primaryKey) {
      table.primaryKey = {
        constraintType: 'primaryKey',
        pureName: table.pureName,
        schemaName: table.schemaName,
        columns: [],
      };
    }
    table.primaryKey.columns = [
      ...table.primaryKey.columns,
      {
        columnName: newColumn.columnName,
      },
    ];
  }

  console.log('processPrimaryKey', oldColumn, newColumn);

  if (oldColumn?.isPrimaryKey && !newColumn?.isPrimaryKey) {
    if (table.primaryKey) {
      table.primaryKey = {
        ...table.primaryKey,
        columns: table.primaryKey.columns.filter(x => x.columnName != oldColumn.columnName),
      };
      if (table.primaryKey.columns.length == 0) {
        table.primaryKey = null;
      }
    }
  }
}

export function editorAddColumn(table: TableInfo, column: ColumnInfo): TableInfo {
  const res = {
    ...table,
    columns: [...table.columns, { ...column, pairingId: uuidv1() }],
  };

  processPrimaryKey(res, null, column);

  return res;
}

export function editorModifyColumn(table: TableInfo, column: ColumnInfo): TableInfo {
  const oldColumn = table?.columns?.find(x => x.pairingId == column.pairingId);

  const res = {
    ...table,
    columns: table.columns.map(col => (col.pairingId == column.pairingId ? column : col)),
  };
  processPrimaryKey(res, oldColumn, column);

  return res;
}

export function editorDeleteColumn(table: TableInfo, column: ColumnInfo): TableInfo {
  const res = {
    ...table,
    columns: table.columns.filter(col => col.pairingId != column.pairingId),
  };

  processPrimaryKey(res, column, null);

  return res;
}
