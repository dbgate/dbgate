import { ColumnInfo, ConstraintInfo, TableInfo } from './dbinfo';

export interface AlterProcessor {
  createTable(table: TableInfo);
  dropTable(table: TableInfo);
  createColumn(column: ColumnInfo, constraints: ConstraintInfo[]);
  changeColumn(oldColumn: ColumnInfo, newColumn: ColumnInfo);
  dropColumn(column: ColumnInfo);
  createConstraint(constraint: ConstraintInfo);
  changeConstraint(oldConstraint: ConstraintInfo, newConstraint: ConstraintInfo);
  dropConstraint(constraint: ConstraintInfo);
  renameTable(table: TableInfo, newName: string);
  renameColumn(column: ColumnInfo, newName: string);
  renameConstraint(constraint: ConstraintInfo, newName: string);
}
