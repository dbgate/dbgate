import _ from 'lodash';
import {
  AlterProcessor,
  ColumnInfo,
  ConstraintInfo,
  DatabaseInfo,
  NamedObjectInfo,
  SqlDialect,
  TableInfo,
} from '../../types';

interface AlterOperation_CreateTable {
  operationType: 'createTable';
  newObject: TableInfo;
}

interface AlterOperation_DropTable {
  operationType: 'dropTable';
  oldObject: TableInfo;
}

interface AlterOperation_RenameTable {
  operationType: 'renameTable';
  object: TableInfo;
  newName: string;
}

interface AlterOperation_CreateColumn {
  operationType: 'createColumn';
  newObject: ColumnInfo;
}

interface AlterOperation_ChangeColumn {
  operationType: 'changeColumn';
  oldObject: ColumnInfo;
  newObject: ColumnInfo;
}

interface AlterOperation_RenameColumn {
  operationType: 'renameColumn';
  object: ColumnInfo;
  newName: string;
}

interface AlterOperation_DropColumn {
  operationType: 'dropColumn';
  oldObject: ColumnInfo;
}

interface AlterOperation_CreateConstraint {
  operationType: 'createConstraint';
  newObject: ConstraintInfo;
}

interface AlterOperation_ChangeConstraint {
  operationType: 'changeConstraint';
  oldObject: ConstraintInfo;
  newObject: ConstraintInfo;
}

interface AlterOperation_DropConstraint {
  operationType: 'dropConstraint';
  oldObject: ConstraintInfo;
}

interface AlterOperation_RenameConstraint {
  operationType: 'renameConstraint';
  object: ConstraintInfo;
  newName: string;
}

type AlterOperation =
  | AlterOperation_CreateColumn
  | AlterOperation_ChangeColumn
  | AlterOperation_DropColumn
  | AlterOperation_CreateConstraint
  | AlterOperation_ChangeConstraint
  | AlterOperation_DropConstraint
  | AlterOperation_CreateTable
  | AlterOperation_DropTable
  | AlterOperation_RenameTable
  | AlterOperation_RenameColumn
  | AlterOperation_RenameConstraint;

export class AlterPlan {
  public operations: AlterOperation[] = [];
  constructor(public db: DatabaseInfo, public dialect: SqlDialect) {}

  createTable(table: TableInfo) {
    this.operations.push({
      operationType: 'createTable',
      newObject: table,
    });
  }

  dropTable(table: TableInfo) {
    this.operations.push({
      operationType: 'dropTable',
      oldObject: table,
    });
  }

  createColumn(column: ColumnInfo) {
    this.operations.push({
      operationType: 'createColumn',
      newObject: column,
    });
  }

  changeColumn(oldColumn: ColumnInfo, newColumn: ColumnInfo) {
    this.operations.push({
      operationType: 'changeColumn',
      oldObject: oldColumn,
      newObject: newColumn,
    });
  }

  dropColumn(column: ColumnInfo) {
    this.operations.push({
      operationType: 'dropColumn',
      oldObject: column,
    });
  }

  createConstraint(constraint: ConstraintInfo) {
    this.operations.push({
      operationType: 'createConstraint',
      newObject: constraint,
    });
  }

  changeConstraint(oldConstraint: ConstraintInfo, newConstraint: ConstraintInfo) {
    this.operations.push({
      operationType: 'changeConstraint',
      oldObject: oldConstraint,
      newObject: newConstraint,
    });
  }

  dropConstraint(constraint: ConstraintInfo) {
    this.operations.push({
      operationType: 'dropConstraint',
      oldObject: constraint,
    });
  }

  renameTable(table: TableInfo, newName: string) {
    this.operations.push({
      operationType: 'renameTable',
      object: table,
      newName,
    });
  }

  renameColumn(column: ColumnInfo, newName: string) {
    this.operations.push({
      operationType: 'renameColumn',
      object: column,
      newName,
    });
  }

  renameConstraint(constraint: ConstraintInfo, newName: string) {
    this.operations.push({
      operationType: 'renameConstraint',
      object: constraint,
      newName,
    });
  }

  run(processor: AlterProcessor) {
    for (const op of this.operations) {
      runAlterOperation(op, processor);
    }
  }

  _addLogicalDependencies(): AlterOperation[] {
    const lists = this.operations.map(op => {
      if (op.operationType == 'dropColumn') {
        const table = this.db.tables.find(
          x => x.pureName == op.oldObject.pureName && x.schemaName == op.oldObject.schemaName
        );
        const deletedFks = this.dialect.dropColumnDependencies?.includes('foreignKey')
          ? table.dependencies.filter(fk => fk.columns.find(col => col.refColumnName == op.oldObject.columnName))
          : [];

        const deletedConstraints = _.compact([
          table.primaryKey,
          ...table.foreignKeys,
          ...table.indexes,
          ...table.uniques,
        ]).filter(cnt => cnt.columns.find(col => col.columnName == op.oldObject.columnName));

        const res: AlterOperation[] = [
          ...[...deletedFks, ...deletedConstraints].map(oldObject => {
            const opRes: AlterOperation = {
              operationType: 'dropConstraint',
              oldObject,
            };
            return opRes;
          }),
          op,
        ];
        return res;
      }
      return [op];
    });

    return _.flatten(lists);
  }

  transformPlan() {
    this.operations = this._addLogicalDependencies();
  }
}

export function runAlterOperation(op: AlterOperation, processor: AlterProcessor) {
  switch (op.operationType) {
    case 'createTable':
      processor.createTable(op.newObject);
      break;
    case 'changeColumn':
      processor.changeColumn(op.oldObject, op.newObject);
      break;
    case 'createColumn':
      processor.createColumn(op.newObject, []);
      break;
    case 'dropColumn':
      processor.dropColumn(op.oldObject);
      break;
    case 'changeConstraint':
      processor.changeConstraint(op.oldObject, op.newObject);
      break;
    case 'createConstraint':
      processor.createConstraint(op.newObject);
      break;
    case 'dropConstraint':
      processor.dropConstraint(op.oldObject);
      break;
    case 'renameColumn':
      processor.renameColumn(op.object, op.newName);
      break;
    case 'renameTable':
      processor.renameTable(op.object, op.newName);
      break;
    case 'renameConstraint':
      processor.renameConstraint(op.object, op.newName);
      break;
  }
}
