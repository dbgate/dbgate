import { ColumnInfo, DatabaseInfo, ForeignKeyInfo, RangeDefinition, TableInfo } from 'dbgate-types';
import { clearConfigCache } from 'prettier';
import { ChangePerspectiveConfigFunc, PerspectiveConfig } from './PerspectiveConfig';
import _isEqual from 'lodash/isEqual';
import _cloneDeep from 'lodash/cloneDeep';
import _compact from 'lodash/compact';
import _uniq from 'lodash/uniq';
import _flatten from 'lodash/flatten';
import { PerspectiveDataProvider } from './PerspectiveDataProvider';
import { PerspectiveDatabaseConfig } from './PerspectiveDataLoader';

export interface PerspectiveDataLoadProps {
  databaseConfig: PerspectiveDatabaseConfig;
  schemaName: string;
  pureName: string;
  dataColumns: string[];
  bindingColumns?: string[];
  bindingValues?: any[][];
  range?: RangeDefinition;
  loadMore?: boolean;
}

export interface PerspectiveDataLoadPropsWithNode {
  props: PerspectiveDataLoadProps;
  node: PerspectiveTreeNode;
}

// export function groupPerspectiveLoadProps(
//   ...list: PerspectiveDataLoadPropsWithNode[]
// ): PerspectiveDataLoadPropsWithNode[] {
//   const res: PerspectiveDataLoadPropsWithNode[] = [];
//   for (const item of list) {
//     const existing = res.find(
//       x =>
//         x.node == item.node &&
//         x.props.schemaName == item.props.schemaName &&
//         x.props.pureName == item.props.pureName &&
//         _isEqual(x.props.bindingColumns, item.props.bindingColumns)
//     );
//     if (existing) {
//       existing.props.bindingValues.push(...item.props.bindingValues);
//     } else {
//       res.push(_cloneDeep(item));
//     }
//   }
//   return res;
// }

export abstract class PerspectiveTreeNode {
  constructor(
    public config: PerspectiveConfig,
    public setConfig: ChangePerspectiveConfigFunc,
    public parentNode: PerspectiveTreeNode,
    public dataProvider: PerspectiveDataProvider,
    public databaseConfig: PerspectiveDatabaseConfig
  ) {}
  abstract get title();
  abstract get codeName();
  abstract get isExpandable();
  abstract get childNodes(): PerspectiveTreeNode[];
  abstract get icon(): string;
  get fieldName() {
    return this.codeName;
  }
  get dataField() {
    return this.codeName;
  }
  abstract getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps;
  get isRoot() {
    return this.parentNode == null;
  }
  matchChildRow(parentRow: any, childRow: any): boolean {
    return true;
  }

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
  get isChecked() {
    return this.config.checkedColumns.includes(this.uniqueName);
  }
  get columnTitle() {
    return this.title;
  }

  getChildMatchColumns() {
    return [];
  }

  getParentMatchColumns() {
    return [];
  }

  get childDataColumn() {
    if (!this.isExpandable && this.isChecked) {
      return this.codeName;
    }
    return null;
  }

  toggleExpanded(value?: boolean) {
    this.includeInColumnSet('expandedColumns', this.uniqueName, value == null ? !this.isExpanded : value);
  }

  toggleChecked(value?: boolean) {
    this.includeInColumnSet('checkedColumns', this.uniqueName, value == null ? !this.isChecked : value);
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

  getDataLoadColumns() {
    return _compact(
      _uniq([
        ...this.childNodes.map(x => x.childDataColumn),
        ..._flatten(this.childNodes.filter(x => x.isExpandable && x.isChecked).map(x => x.getChildMatchColumns())),
        ...this.getParentMatchColumns(),
      ])
    );
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
    dataProvider: PerspectiveDataProvider,
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode
  ) {
    super(config, setConfig, parentNode, dataProvider, databaseConfig);

    this.foreignKey =
      table.foreignKeys &&
      table.foreignKeys.find(fk => fk.columns.length == 1 && fk.columns[0].columnName == column.columnName);
  }

  matchChildRow(parentRow: any, childRow: any): boolean {
    if (!this.foreignKey) return false;
    return parentRow[this.foreignKey.columns[0].columnName] == childRow[this.foreignKey.columns[0].refColumnName];
  }

  getChildMatchColumns() {
    if (!this.foreignKey) return [];
    return [this.foreignKey.columns[0].columnName];
  }

  getParentMatchColumns() {
    if (!this.foreignKey) return [];
    return [this.foreignKey.columns[0].refColumnName];
  }

  getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps {
    if (!this.foreignKey) return null;
    return {
      schemaName: this.foreignKey.refSchemaName,
      pureName: this.foreignKey.refTableName,
      bindingColumns: [this.foreignKey.columns[0].refColumnName],
      bindingValues: parentRows.map(row => row[this.foreignKey.columns[0].columnName]),
      dataColumns: this.getDataLoadColumns(),
      databaseConfig: this.databaseConfig,
    };
  }

  get icon() {
    if (this.column.autoIncrement) return 'img autoincrement';
    if (this.foreignKey) return 'img foreign-key';
    return 'img column';
  }

  get codeName() {
    return this.column.columnName;
  }

  get fieldName() {
    return this.codeName + 'Ref';
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
    return getTableChildPerspectiveNodes(
      tbl,
      this.db,
      this.config,
      this.setConfig,
      this.dataProvider,
      this.databaseConfig,
      this
    );
  }
}

export class PerspectiveTableNode extends PerspectiveTreeNode {
  constructor(
    public table: TableInfo,
    public db: DatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode
  ) {
    super(config, setConfig, parentNode, dataProvider, databaseConfig);
  }

  getNodeLoadProps(parentRows: any[]) {
    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
      dataColumns: this.getDataLoadColumns(),
      databaseConfig: this.databaseConfig,
    };
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
    return getTableChildPerspectiveNodes(
      this.table,
      this.db,
      this.config,
      this.setConfig,
      this.dataProvider,
      this.databaseConfig,
      this
    );
  }

  get icon() {
    return 'img table';
  }
}

export class PerspectiveTableReferenceNode extends PerspectiveTableNode {
  constructor(
    public foreignKey: ForeignKeyInfo,
    table: TableInfo,
    db: DatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode
  ) {
    super(table, db, config, setConfig, dataProvider, databaseConfig, parentNode);
  }

  matchChildRow(parentRow: any, childRow: any): boolean {
    if (!this.foreignKey) return false;
    return parentRow[this.foreignKey.columns[0].refColumnName] == childRow[this.foreignKey.columns[0].columnName];
  }

  getChildMatchColumns() {
    if (!this.foreignKey) return [];
    return [this.foreignKey.columns[0].refColumnName];
  }

  getParentMatchColumns() {
    if (!this.foreignKey) return [];
    return [this.foreignKey.columns[0].columnName];
  }

  getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps {
    if (!this.foreignKey) return null;
    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
      bindingColumns: [this.foreignKey.columns[0].columnName],
      bindingValues: parentRows.map(row => row[this.foreignKey.columns[0].refColumnName]),
      dataColumns: this.getDataLoadColumns(),
      databaseConfig: this.databaseConfig,
    };
  }

  get columnTitle() {
    return this.table.pureName;
  }
}

export function getTableChildPerspectiveNodes(
  table: TableInfo,
  db: DatabaseInfo,
  config: PerspectiveConfig,
  setConfig: ChangePerspectiveConfigFunc,
  dataProvider: PerspectiveDataProvider,
  databaseConfig: PerspectiveDatabaseConfig,
  parentColumn: PerspectiveTreeNode
) {
  if (!table) return [];
  const res = [];
  res.push(
    ...table.columns.map(
      col =>
        new PerspectiveTableColumnNode(col, table, db, config, setConfig, dataProvider, databaseConfig, parentColumn)
    )
  );
  if (db && table.dependencies) {
    for (const fk of table.dependencies) {
      const tbl = db.tables.find(x => x.pureName == fk.pureName && x.schemaName == fk.schemaName);
      if (tbl)
        res.push(
          new PerspectiveTableReferenceNode(fk, tbl, db, config, setConfig, dataProvider, databaseConfig, parentColumn)
        );
    }
  }
  return res;
}
