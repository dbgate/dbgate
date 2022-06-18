import { ColumnInfo, DatabaseInfo, ForeignKeyInfo, TableInfo } from 'dbgate-types';
import { clearConfigCache } from 'prettier';
import { ChangePerspectiveConfigFunc, PerspectiveConfig } from './PerspectiveConfig';

export abstract class PerspectiveTreeNode {
  constructor(
    public config: PerspectiveConfig,
    public setConfig: ChangePerspectiveConfigFunc,
    public parentNode: PerspectiveTreeNode
  ) {}
  abstract get title();
  abstract get codeName();
  abstract get isExpandable();
  abstract get childNodes(): PerspectiveTreeNode[];
  abstract get icon(): string;
  get uniqueName() {
    if (this.parentNode) return `${this.parentNode.uniqueName}.${this.codeName}`;
    return this.codeName;
  }
  get level() {
    if (this.parentNode) return this.parentNode.level + 1;
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

export class PerspectiveTableColumnNode extends PerspectiveTreeNode {
  foreignKey: ForeignKeyInfo;
  constructor(
    public column: ColumnInfo,
    public table: TableInfo,
    public db: DatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    parentColumn: PerspectiveTreeNode
  ) {
    super(config, setConfig, parentColumn);

    this.foreignKey =
      table.foreignKeys &&
      table.foreignKeys.find(fk => fk.columns.length == 1 && fk.columns[0].columnName == column.columnName);
  }

  get icon() {
    if (this.column.autoIncrement) return 'img autoincrement';
    if (this.foreignKey) return 'img foreign-key';
    return 'img column';
  }

  get codeName() {
    return this.column.columnName;
  }

  get title() {
    return this.column.columnName;
  }

  get isExpandable() {
    return !!this.foreignKey;
  }

  get childNodes(): PerspectiveTreeNode[] {
    if (!this.foreignKey) return [];
    const tbl = this?.db?.tables?.find(
      x => x.pureName == this.foreignKey?.refTableName && x.schemaName == this.foreignKey?.refSchemaName
    );
    return getTableChildPerspectiveNodes(tbl, this.db, this.config, this.setConfig, this);
  }
}

export class PerspectiveTableReferenceNode extends PerspectiveTreeNode {
  foreignKey: ForeignKeyInfo;
  constructor(
    public fk: ForeignKeyInfo,
    public table: TableInfo,
    public db: DatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    parentColumn: PerspectiveTreeNode
  ) {
    super(config, setConfig, parentColumn);
  }

  get codeName() {
    return this.table.schemaName ? `${this.table.schemaName}:${this.table.pureName}` : this.table.pureName;
  }

  get title() {
    return this.table.pureName;
  }

  get isExpandable() {
    return true;
  }

  get childNodes(): PerspectiveTreeNode[] {
    return getTableChildPerspectiveNodes(this.table, this.db, this.config, this.setConfig, this);
  }

  get icon() {
    return 'img table';
  }
}

export function getTableChildPerspectiveNodes(
  table: TableInfo,
  db: DatabaseInfo,
  config: PerspectiveConfig,
  setConfig: ChangePerspectiveConfigFunc,
  parentColumn: PerspectiveTreeNode
) {
  if (!table) return [];
  const res = [];
  res.push(
    ...table.columns.map(col => new PerspectiveTableColumnNode(col, table, db, config, setConfig, parentColumn))
  );
  if (db && table.dependencies) {
    for (const fk of table.dependencies) {
      const tbl = db.tables.find(x => x.pureName == fk.pureName && x.schemaName == fk.schemaName);
      if (tbl) res.push(new PerspectiveTableReferenceNode(fk, tbl, db, config, setConfig, parentColumn));
    }
  }
  return res;
}
