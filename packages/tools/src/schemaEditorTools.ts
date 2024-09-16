import uuidv1 from 'uuid/v1';
import _omit from 'lodash/omit';
import type {
  ColumnInfo,
  ColumnsConstraintInfo,
  ConstraintInfo,
  ForeignKeyInfo,
  IndexInfo,
  PrimaryKeyInfo,
  TableInfo,
  UniqueInfo,
} from 'dbgate-types';
import _ from 'lodash';
import { parseSqlDefaultValue } from './stringTools';

export interface JsonDataObjectUpdateCommand {
  type: 'renameField' | 'deleteField' | 'setField' | 'setFieldIfNull';
  oldField?: string;
  newField?: string;
  value?: any;
}

export interface EditorColumnInfo extends ColumnInfo {
  isPrimaryKey?: boolean;
}

export function fillEditorColumnInfo(column: ColumnInfo, table: TableInfo): EditorColumnInfo {
  return {
    isPrimaryKey: !!table?.primaryKey?.columns?.find(x => x.columnName == column.columnName),
    dataType: _.isEmpty(column) ? 'int' : undefined,
    ...column,
  };
}

export function processJsonDataUpdateCommands(obj: any, commands: JsonDataObjectUpdateCommand[] = []) {
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'deleteField':
        obj = {
          ...obj,
        };
        delete obj[cmd.oldField];
        break;
      case 'renameField':
        obj = {
          ...obj,
        };
        obj[cmd.newField] = obj[cmd.oldField];
        delete obj[cmd.oldField];
        break;
      case 'setField':
        obj = {
          ...obj,
        };
        obj[cmd.newField] = cmd.value;
        break;
      case 'setFieldIfNull':
        obj = {
          ...obj,
        };
        if (obj[cmd.newField] == null) {
          obj[cmd.newField] = cmd.value;
        }
        break;
    }
  }
  return obj;
}

function processPrimaryKey(table: TableInfo, oldColumn: EditorColumnInfo, newColumn: EditorColumnInfo): TableInfo {
  if (!oldColumn?.isPrimaryKey && newColumn?.isPrimaryKey) {
    let primaryKey = table?.primaryKey;
    if (!primaryKey) {
      primaryKey = {
        constraintType: 'primaryKey',
        pureName: table.pureName,
        schemaName: table.schemaName,
        columns: [],
      };
    }
    return {
      ...table,
      primaryKey: {
        ...primaryKey,
        columns: [
          ...primaryKey.columns,
          {
            columnName: newColumn.columnName,
          },
        ],
      },
    };
  }

  if (oldColumn?.isPrimaryKey && !newColumn?.isPrimaryKey) {
    let primaryKey = table?.primaryKey;
    if (primaryKey) {
      primaryKey = {
        ...primaryKey,
        columns: table.primaryKey.columns.filter(x => x.columnName != oldColumn.columnName),
      };
      if (primaryKey.columns.length == 0) {
        return {
          ...table,
          primaryKey: null,
        };
      }
      return {
        ...table,
        primaryKey,
      };
    }
  }

  return table;
}

function defineDataCommand(table: TableInfo, cmd: () => JsonDataObjectUpdateCommand) {
  table['__addDataCommands'] = [...(table['__addDataCommands'] || []), cmd()];
}

export function editorAddColumn(table: TableInfo, column: EditorColumnInfo, addDataCommand?: boolean): TableInfo {
  let res = {
    ...table,
    columns: [...(table?.columns || []), { ...column, pairingId: uuidv1() }],
  };

  res = processPrimaryKey(res, null, column);

  if (addDataCommand && column.defaultValue) {
    defineDataCommand(res, () => ({
      type: 'setField',
      newField: column.columnName,
      value: parseSqlDefaultValue(column.defaultValue),
    }));
  }

  return res;
}

export function editorModifyColumn(table: TableInfo, column: EditorColumnInfo, addDataCommand?: boolean): TableInfo {
  const oldColumn = table?.columns?.find(x => x.pairingId == column.pairingId);

  let res = {
    ...table,
    columns: table.columns.map(col => (col.pairingId == column.pairingId ? _omit(column, ['isPrimaryKey']) : col)),
  };
  res = processPrimaryKey(res, fillEditorColumnInfo(oldColumn, table), column);

  if (addDataCommand && oldColumn.columnName != column.columnName) {
    defineDataCommand(res, () => ({
      type: 'renameField',
      oldField: oldColumn.columnName,
      newField: column.columnName,
    }));
  }

  if (addDataCommand && !oldColumn.defaultValue && column.defaultValue) {
    defineDataCommand(res, () => ({
      type: 'setFieldIfNull',
      newField: column.columnName,
      value: parseSqlDefaultValue(column.defaultValue),
    }));
  }

  return res;
}

export function editorDeleteColumn(table: TableInfo, column: EditorColumnInfo, addDataCommand?: boolean): TableInfo {
  let res = {
    ...table,
    columns: table.columns.filter(col => col.pairingId != column.pairingId),
  };

  res = processPrimaryKey(res, column, null);

  if (addDataCommand) {
    defineDataCommand(res, () => ({
      type: 'deleteField',
      oldField: column.columnName,
    }));
  }

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

  if (constraint.constraintType == 'sortingKey') {
    res.sortingKey = {
      pairingId: uuidv1(),
      ...constraint,
    } as ColumnsConstraintInfo;
  }

  if (constraint.constraintType == 'foreignKey') {
    res.foreignKeys = [
      ...(res.foreignKeys || []),
      {
        pairingId: uuidv1(),
        ...constraint,
      } as ForeignKeyInfo,
    ];
  }

  if (constraint.constraintType == 'index') {
    res.indexes = [
      ...(res.indexes || []),
      {
        pairingId: uuidv1(),
        ...constraint,
      } as IndexInfo,
    ];
  }

  if (constraint.constraintType == 'unique') {
    res.uniques = [
      ...(res.uniques || []),
      {
        pairingId: uuidv1(),
        ...constraint,
      } as UniqueInfo,
    ];
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

  if (constraint.constraintType == 'sortingKey') {
    res.sortingKey = {
      ...res.sortingKey,
      ...constraint,
    };
  }

  if (constraint.constraintType == 'foreignKey') {
    res.foreignKeys = table.foreignKeys.map(fk =>
      fk.pairingId == constraint.pairingId ? { ...fk, ...constraint } : fk
    );
  }

  if (constraint.constraintType == 'index') {
    res.indexes = table.indexes.map(fk => (fk.pairingId == constraint.pairingId ? { ...fk, ...constraint } : fk));
  }

  if (constraint.constraintType == 'unique') {
    res.uniques = table.uniques.map(fk => (fk.pairingId == constraint.pairingId ? { ...fk, ...constraint } : fk));
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

  if (constraint.constraintType == 'sortingKey') {
    res.sortingKey = null;
  }

  if (constraint.constraintType == 'foreignKey') {
    res.foreignKeys = table.foreignKeys.filter(x => x.pairingId != constraint.pairingId);
  }

  if (constraint.constraintType == 'index') {
    res.indexes = table.indexes.filter(x => x.pairingId != constraint.pairingId);
  }

  if (constraint.constraintType == 'unique') {
    res.uniques = table.uniques.filter(x => x.pairingId != constraint.pairingId);
  }

  return res;
}
