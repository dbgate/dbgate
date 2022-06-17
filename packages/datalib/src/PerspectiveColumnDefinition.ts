import { ColumnInfo, DatabaseInfo, ForeignKeyInfo, TableInfo } from 'dbgate-types';
import { clearConfigCache } from 'prettier';
import { ChangePerspectiveConfigFunc, PerspectiveConfig } from './PerspectiveConfig';

export abstract class PerspectiveColumnDefinition {
  constructor(
    public config: PerspectiveConfig,
    public setConfig: ChangePerspectiveConfigFunc,
    public parentColumn: PerspectiveTableColumnDefinition
  ) {}
  abstract get title();
  abstract get codeName();
  abstract get props();
  abstract get isExpandable();
  abstract get childColumns(): PerspectiveColumnDefinition[];
  get uniqueName() {
    if (this.parentColumn) return `${this.parentColumn.uniqueName}.${this.codeName}`;
    return this.codeName;
  }
  get level() {
    if (this.parentColumn) return this.parentColumn.level + 1;
    return 0;
  }
  get isExpanded() {
    return this.config.expandedColumns.includes(this.uniqueName);
  }

  toggleExpanded(value?: boolean) {
    this.includeInColumnSet('expandedColumns', this.uniqueName, value == null ? !this.isExpanded : value);
  }

  includeInColumnSet(field: keyof PerspectiveConfig, uniqueName: string, isIncluded: boolean) {
    if (isIncluded) {
      this.setConfig(cfg => ({
        ...cfg,
        [field]: [...(cfg[field] || []), uniqueName],
      }));
    } else {
      this.setConfig(cfg => ({
        ...cfg,
        [field]: (cfg[field] || []).filter(x => x != uniqueName),
      }));
    }
  }
}

export class PerspectiveTableColumnDefinition extends PerspectiveColumnDefinition {
  foreignKey: ForeignKeyInfo;
  constructor(
    public column: ColumnInfo,
    public table: TableInfo,
    public db: DatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    parentColumn: PerspectiveTableColumnDefinition
  ) {
    super(config, setConfig, parentColumn);

    this.foreignKey =
      table.foreignKeys &&
      table.foreignKeys.find(fk => fk.columns.length == 1 && fk.columns[0].columnName == column.columnName);
  }

  get codeName() {
    return this.column.columnName;
  }

  get title() {
    return this.column.columnName;
  }

  get props() {
    return this.column;
  }

  get isExpandable() {
    return !!this.foreignKey;
  }

  get childColumns(): PerspectiveColumnDefinition[] {
    if (!this.foreignKey) return [];
    const tbl = this?.db?.tables?.find(
      x => x.pureName == this.foreignKey?.refTableName && x.schemaName == this.foreignKey?.refSchemaName
    );
    return (
      tbl?.columns?.map(
        col => new PerspectiveTableColumnDefinition(col, tbl, this.db, this.config, this.setConfig, this)
      ) || []
    );
  }
}
