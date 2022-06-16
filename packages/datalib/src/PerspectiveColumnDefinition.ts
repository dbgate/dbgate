import { ColumnInfo, ForeignKeyInfo, TableInfo } from 'dbgate-types';
import { clearConfigCache } from 'prettier';
import { ChangePerspectiveConfigFunc, PerspectiveConfig } from './PerspectiveConfig';

export abstract class PerspectiveColumnDefinition {
  abstract get title();
  abstract get props();
  abstract get isExpanded();
  abstract get isExpandable();
  abstract get level();
  abstract toggleExpanded();
}

export class PerspectiveTableColumnDefinition extends PerspectiveColumnDefinition {
  foreignKey: ForeignKeyInfo;
  constructor(
    public column: ColumnInfo,
    public table: TableInfo,
    public config: PerspectiveConfig,
    public setConfig: ChangePerspectiveConfigFunc
  ) {
    super();

    this.foreignKey =
      table.foreignKeys &&
      table.foreignKeys.find(fk => fk.columns.length == 1 && fk.columns[0].columnName == column.columnName);
  }

  get title() {
    return this.column.columnName;
  }

  get props() {
    return this.column;
  }

  get isExpanded() {
    return this.config.expandedColumns.includes(this.column.uniqueName);
  }

  get isExpandable() {
    return !!this.foreignKey;
  }

  get level() {
    return 0;
  }

  toggleExpanded() {}
}
