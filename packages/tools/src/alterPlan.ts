import { ColumnInfo, ConstraintInfo, DatabaseInfo, TableInfo } from '../../types';

interface AlterOperation_CreateTable {
  operationType: 'createTable';
  newObject: TableInfo;
}

interface AlterOperation_DropTable {
  operationType: 'dropTable';
  oldObject: TableInfo;
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

type AlterOperation =
  | AlterOperation_CreateColumn
  | AlterOperation_ChangeColumn
  | AlterOperation_DropColumn
  | AlterOperation_CreateConstraint
  | AlterOperation_ChangeConstraint
  | AlterOperation_DropConstraint
  | AlterOperation_CreateTable
  | AlterOperation_DropTable;

export class AlterPlan {
  operations: AlterOperation[] = [];
  constructor(public db: DatabaseInfo) {}

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

}
