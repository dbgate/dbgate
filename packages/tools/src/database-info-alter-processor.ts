import { ColumnInfo, ConstraintInfo, DatabaseInfo, ForeignKeyInfo, PrimaryKeyInfo, TableInfo } from '../../types';

export class DatabaseInfoAlterProcessor {
  constructor(public db: DatabaseInfo) {}

  createTable(table: TableInfo) {
    this.db.tables.push(table);
  }

  dropTable(table: TableInfo) {
    this.db.tables = this.db.tables.filter(x => x.pureName != table.pureName && x.schemaName != table.schemaName);
  }

  createColumn(column: ColumnInfo) {
    const table = this.db.tables.find(x => x.pureName == column.pureName && x.schemaName == column.schemaName);
    table.columns.push(column);
  }

  changeColumn(oldColumn: ColumnInfo, newColumn: ColumnInfo) {
    const table = this.db.tables.find(x => x.pureName == oldColumn.pureName && x.schemaName == oldColumn.schemaName);
    table.columns = table.columns.map(x => (x.columnName == oldColumn.columnName ? newColumn : x));
  }

  dropColumn(column: ColumnInfo) {
    const table = this.db.tables.find(x => x.pureName == column.pureName && x.schemaName == column.schemaName);
    table.columns = table.columns.filter(x => x.columnName != column.columnName);
  }

  createConstraint(constraint: ConstraintInfo) {
    const table = this.db.tables.find(x => x.pureName == constraint.pureName && x.schemaName == constraint.schemaName);
    switch (constraint.constraintType) {
      case 'primaryKey':
        table.primaryKey = constraint as PrimaryKeyInfo;
        break;
      case 'foreignKey':
        table.foreignKeys.push(constraint as ForeignKeyInfo);
        break;
    }
  }

  changeConstraint(oldConstraint: ConstraintInfo, newConstraint: ConstraintInfo) {
    const table = this.db.tables.find(
      x => x.pureName == oldConstraint.pureName && x.schemaName == oldConstraint.schemaName
    );
  }

  dropConstraint(constraint: ConstraintInfo) {
    const table = this.db.tables.find(x => x.pureName == constraint.pureName && x.schemaName == constraint.schemaName);
    switch (constraint.constraintType) {
      case 'primaryKey':
        table.primaryKey = null;
        break;
      case 'foreignKey':
        table.foreignKeys = table.foreignKeys.filter(x => x.constraintName != constraint.constraintName);
        break;
    }
  }

  renameTable(table: TableInfo, newName: string) {
    this.db.tables.find(x => x.pureName == table.pureName && x.schemaName == table.schemaName).pureName = newName;
  }

  renameColumn(column: ColumnInfo, newName: string) {
    const table = this.db.tables.find(x => x.pureName == column.pureName && x.schemaName == column.schemaName);
    table.columns.find(x => x.columnName == column.columnName).columnName = newName;
  }

  renameConstraint(constraint: ConstraintInfo, newName: string) {}
}
