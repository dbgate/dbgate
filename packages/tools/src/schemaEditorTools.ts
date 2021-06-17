import uuidv1 from 'uuid/v1';
import { ColumnInfo, ConstraintInfo, PrimaryKeyInfo, TableInfo } from 'dbgate-types';

export interface EditorColumnInfo extends ColumnInfo {
  isPrimaryKey?: boolean;
}

export function fillEditorColumnInfo(column: ColumnInfo, table: TableInfo): EditorColumnInfo {
  return {
    isPrimaryKey: !!(table.primaryKey && table.primaryKey.columns.find(x => x.columnName == column.columnName)),
    ...column,
  };
}

function processPrimaryKey(table: TableInfo, oldColumn: EditorColumnInfo, newColumn: EditorColumnInfo) {
  if (!oldColumn?.isPrimaryKey && newColumn?.isPrimaryKey) {
    //   let primaryKey = table.primaryKey
    //   if (!primaryKey) {
    //     primaryKey = {
    //         constraintType: 'primaryKey',
    //         pureName: table.pureName,
    //         schemaName: table.schemaName,
    //         columns: [],
    //       };
    //   }
    //   return {
    //       ...table,
    //       primaryKey: {
    //           ...primaryKey,
    //           columns:[
    //               ...primaryKey.columns,
    //               {
    //                 columnName: newColumn.columnName,
    //               },

    //           ]
    //        }
    //   }
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

export function editorAddColumn(table: TableInfo, column: EditorColumnInfo): TableInfo {
  const res = {
    ...table,
    columns: [...table.columns, { ...column, pairingId: uuidv1() }],
  };

  processPrimaryKey(res, null, column);

  return res;
}

export function editorModifyColumn(table: TableInfo, column: EditorColumnInfo): TableInfo {
  const oldColumn = table?.columns?.find(x => x.pairingId == column.pairingId);

  const res = {
    ...table,
    columns: table.columns.map(col => (col.pairingId == column.pairingId ? column : col)),
  };
  processPrimaryKey(res, oldColumn, column);

  return res;
}

export function editorDeleteColumn(table: TableInfo, column: EditorColumnInfo): TableInfo {
  const res = {
    ...table,
    columns: table.columns.filter(col => col.pairingId != column.pairingId),
  };

  processPrimaryKey(res, column, null);

  return res;
}

export function editorAddConstraint(table: TableInfo, constraint: ConstraintInfo): TableInfo {
  const res = {
    ...table,
  };

  if (constraint.constraintType == 'primaryKey') {
    res.primaryKey = {
      pairingId: uuidv1(),
      ...constraint,
    } as PrimaryKeyInfo;
  }

  return res;
}

export function editorModifyConstraint(table: TableInfo, constraint: ConstraintInfo): TableInfo {
  const res = {
    ...table,
  };

  if (constraint.constraintType == 'primaryKey') {
    res.primaryKey = {
      ...res.primaryKey,
      ...constraint,
    };
  }

  return res;
}

export function editorDeleteConstraint(table: TableInfo, constraint: ConstraintInfo): TableInfo {
  const res = {
    ...table,
  };

  if (constraint.constraintType == 'primaryKey') {
    res.primaryKey = null;
  }

  return res;
}
