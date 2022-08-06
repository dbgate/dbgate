import { ColumnInfo, DatabaseInfo, ForeignKeyInfo, RangeDefinition, TableInfo, ViewInfo } from 'dbgate-types';
import { clearConfigCache } from 'prettier';
import {
  ChangePerspectiveConfigFunc,
  PerspectiveConfig,
  PerspectiveConfigColumns,
  PerspectiveCustomJoinConfig,
  PerspectiveFilterColumnInfo,
} from './PerspectiveConfig';
import _isEqual from 'lodash/isEqual';
import _cloneDeep from 'lodash/cloneDeep';
import _compact from 'lodash/compact';
import _uniq from 'lodash/uniq';
import _flatten from 'lodash/flatten';
import _uniqBy from 'lodash/uniqBy';
import _sortBy from 'lodash/sortBy';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import {
  PerspectiveDatabaseConfig,
  PerspectiveDataLoadProps,
  PerspectiveDataProvider,
} from './PerspectiveDataProvider';
import stableStringify from 'json-stable-stringify';
import { getFilterType, parseFilter } from 'dbgate-filterparser';
import { FilterType } from 'dbgate-filterparser/lib/types';
import { Condition, Expression } from 'dbgate-sqltree';
import { getPerspectiveDefaultColumns } from './getPerspectiveDefaultColumns';

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
  defaultChecked: boolean;
  abstract get title();
  abstract get codeName();
  abstract get isExpandable();
  abstract get childNodes(): PerspectiveTreeNode[];
  abstract get icon(): string;
  get fieldName() {
    return this.codeName;
  }
  get headerDataAttributes() {
    return {};
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
    if (this.config.checkedColumns.includes(this.uniqueName)) return true;
    if (this.config.uncheckedColumns.includes(this.uniqueName)) return false;
    return this.defaultChecked;
  }
  get columnTitle() {
    return this.title;
  }
  get filterType(): FilterType {
    return 'string';
  }
  get columnName() {
    return null;
  }
  get customJoinConfig(): PerspectiveCustomJoinConfig {
    return null;
  }

  getChildMatchColumns() {
    return [];
  }

  getParentMatchColumns() {
    return [];
  }

  parseFilterCondition() {
    return null;
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
    if (this.defaultChecked) {
      this.includeInColumnSet('uncheckedColumns', this.uniqueName, value == null ? this.isChecked : value);
    } else {
      this.includeInColumnSet('checkedColumns', this.uniqueName, value == null ? !this.isChecked : value);
    }
  }

  includeInColumnSet(field: keyof PerspectiveConfigColumns, uniqueName: string, isIncluded: boolean) {
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

  // setFilter(value) {
  //   this.setConfig(
  //     cfg => ({
  //       ...cfg,
  //       filters: {
  //         ...cfg.filters,
  //         [this.uniqueName]: value,
  //       },
  //       filterInfos: {
  //         ...cfg.filterInfos,
  //         [this.uniqueName]: {
  //           columnName: this.columnName,
  //           filterType: this.filterType,
  //         },
  //       },
  //     }),
  //     true
  //   );
  // }

  getFilter() {
    return this.config.filters[this.uniqueName];
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

  getChildrenCondition(): Condition {
    const conditions = _compact(this.childNodes.map(x => x.parseFilterCondition()));
    if (conditions.length == 0) {
      return null;
    }
    if (conditions.length == 1) {
      return conditions[0];
    }
    return {
      conditionType: 'and',
      conditions,
    };
  }

  getOrderBy(table: TableInfo | ViewInfo): PerspectiveDataLoadProps['orderBy'] {
    const res = _compact(
      this.childNodes.map(node => {
        const sort = this.config?.sort?.[node?.parentNode?.uniqueName]?.find(x => x.uniqueName == node.uniqueName);
        if (sort) {
          return {
            columnName: node.columnName,
            order: sort.order,
          };
        }
      })
    );
    return res.length > 0
      ? res
      : (table as TableInfo)?.primaryKey?.columns.map(x => ({ columnName: x.columnName, order: 'ASC' })) || [
          { columnName: table?.columns[0].columnName, order: 'ASC' },
        ];
  }

  getBaseTables() {
    const res = [];
    const table = this.getBaseTableFromThis();
    if (table) res.push({ table, node: this });
    for (const child of this.childNodes) {
      if (!child.isChecked) continue;
      res.push(...child.getBaseTables());
    }
    return res;
  }
  getBaseTableFromThis() {
    return null;
  }

  get filterInfo(): PerspectiveFilterColumnInfo {
    return null;
  }
}

export class PerspectiveTableColumnNode extends PerspectiveTreeNode {
  foreignKey: ForeignKeyInfo;
  refTable: TableInfo;
  constructor(
    public column: ColumnInfo,
    public table: TableInfo | ViewInfo,
    public db: DatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    dataProvider: PerspectiveDataProvider,
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode,
    defaultChecked: boolean
  ) {
    super(config, setConfig, parentNode, dataProvider, databaseConfig);

    this.defaultChecked = defaultChecked;

    this.foreignKey = (table as TableInfo)?.foreignKeys?.find(
      fk => fk.columns.length == 1 && fk.columns[0].columnName == column.columnName
    );

    this.refTable = db.tables.find(
      x => x.pureName == this.foreignKey?.refTableName && x.schemaName == this.foreignKey?.refSchemaName
    );
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
      bindingValues: _uniqBy(
        parentRows.map(row => [row[this.foreignKey.columns[0].columnName]]),
        stableStringify
      ),
      dataColumns: this.getDataLoadColumns(),
      databaseConfig: this.databaseConfig,
      orderBy: this.getOrderBy(this.refTable),
      condition: this.getChildrenCondition(),
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

  get columnName() {
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

  get filterType(): FilterType {
    return getFilterType(this.column.dataType);
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

  getBaseTableFromThis() {
    return this.refTable;
  }

  get filterInfo(): PerspectiveFilterColumnInfo {
    return {
      columnName: this.columnName,
      filterType: this.filterType,
      pureName: this.column.pureName,
      schemaName: this.column.schemaName,
      foreignKey: this.foreignKey,
    };
  }

  parseFilterCondition() {
    const filter = this.getFilter();
    if (!filter) return null;
    const condition = parseFilter(filter, this.filterType);
    if (!condition) return null;
    return _cloneDeepWith(condition, (expr: Expression) => {
      if (expr.exprType == 'placeholder') {
        return {
          exprType: 'column',
          columnName: this.column.columnName,
        };
      }
    });

    return condition;
  }

  get headerDataAttributes() {
    if (this.foreignKey) {
      return {
        schemaName: this.foreignKey.refSchemaName,
        pureName: this.foreignKey.refTableName,
        conid: this.databaseConfig.conid,
        database: this.databaseConfig.database,
      };
    }
    return null;
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

  getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps {
    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
      dataColumns: this.getDataLoadColumns(),
      databaseConfig: this.databaseConfig,
      orderBy: this.getOrderBy(this.table),
      condition: this.getChildrenCondition(),
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

  getBaseTableFromThis() {
    return this.table;
  }

  get headerDataAttributes() {
    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
      conid: this.databaseConfig.conid,
      database: this.databaseConfig.database,
    };
  }
}

export class PerspectiveViewNode extends PerspectiveTreeNode {
  constructor(
    public view: ViewInfo,
    public db: DatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode
  ) {
    super(config, setConfig, parentNode, dataProvider, databaseConfig);
  }

  getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps {
    return {
      schemaName: this.view.schemaName,
      pureName: this.view.pureName,
      dataColumns: this.getDataLoadColumns(),
      databaseConfig: this.databaseConfig,
      orderBy: this.getOrderBy(this.view),
      condition: this.getChildrenCondition(),
    };
  }

  get codeName() {
    return this.view.schemaName ? `${this.view.schemaName}:${this.view.pureName}` : this.view.pureName;
  }

  get title() {
    return this.view.pureName;
  }

  get isExpandable() {
    return true;
  }

  get childNodes(): PerspectiveTreeNode[] {
    return getTableChildPerspectiveNodes(
      this.view,
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

  getBaseTableFromThis() {
    return this.view;
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
    public isMultiple: boolean,
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
      bindingValues: _uniqBy(
        parentRows.map(row => [row[this.foreignKey.columns[0].refColumnName]]),
        stableStringify
      ),
      dataColumns: this.getDataLoadColumns(),
      databaseConfig: this.databaseConfig,
      orderBy: this.getOrderBy(this.table),
      condition: this.getChildrenCondition(),
    };
  }

  get columnTitle() {
    return this.table.pureName;
  }

  get title() {
    if (this.isMultiple) {
      return `${super.title} (${this.foreignKey.columns.map(x => x.columnName).join(', ')})`;
    }
    return super.title;
  }

  get codeName() {
    if (this.isMultiple) {
      return `${super.codeName}-${this.foreignKey.columns.map(x => x.columnName).join('_')}`;
    }
    return super.codeName;
  }

}

export class PerspectiveCustomJoinTreeNode extends PerspectiveTableNode {
  constructor(
    public customJoin: PerspectiveCustomJoinConfig,
    db: DatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode
  ) {
    super(
      db.tables.find(x => x.pureName == customJoin.refTableName && x.schemaName == customJoin.refSchemaName),
      db,
      config,
      setConfig,
      dataProvider,
      databaseConfig,
      parentNode
    );
  }

  matchChildRow(parentRow: any, childRow: any): boolean {
    for (const column of this.customJoin.columns) {
      if (parentRow[column.baseColumnName] != childRow[column.refColumnName]) {
        return false;
      }
    }
    return true;
  }

  getChildMatchColumns() {
    return this.customJoin.columns.map(x => x.baseColumnName);
  }

  getParentMatchColumns() {
    return this.customJoin.columns.map(x => x.refColumnName);
  }

  getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps {
    // console.log('CUSTOM JOIN', this.customJoin);
    // console.log('this.getDataLoadColumns()', this.getDataLoadColumns());
    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
      bindingColumns: this.getParentMatchColumns(),
      bindingValues: _uniqBy(
        parentRows.map(row => this.customJoin.columns.map(x => row[x.baseColumnName])),
        stableStringify
      ),
      dataColumns: this.getDataLoadColumns(),
      databaseConfig: this.databaseConfig,
      orderBy: this.getOrderBy(this.table),
      condition: this.getChildrenCondition(),
    };
  }

  get title() {
    return this.customJoin.joinName;
  }

  get icon() {
    return 'icon custom-join';
  }

  get codeName() {
    return this.customJoin.joinid;
  }

  get customJoinConfig(): PerspectiveCustomJoinConfig {
    return this.customJoin;
  }
}

export function getTableChildPerspectiveNodes(
  table: TableInfo | ViewInfo,
  db: DatabaseInfo,
  config: PerspectiveConfig,
  setConfig: ChangePerspectiveConfigFunc,
  dataProvider: PerspectiveDataProvider,
  databaseConfig: PerspectiveDatabaseConfig,
  parentColumn: PerspectiveTreeNode
) {
  if (!table) return [];

  const defaultColumns = getPerspectiveDefaultColumns(table, db);

  const res = [];
  res.push(
    ...table.columns.map(
      col =>
        new PerspectiveTableColumnNode(
          col,
          table,
          db,
          config,
          setConfig,
          dataProvider,
          databaseConfig,
          parentColumn,
          defaultColumns.includes(col.columnName)
        )
    )
  );
  const dependencies = [];
  if (db && (table as TableInfo)?.dependencies) {
    for (const fk of (table as TableInfo)?.dependencies) {
      const tbl = db.tables.find(x => x.pureName == fk.pureName && x.schemaName == fk.schemaName);
      if (tbl) {
        const isMultiple =
          (table as TableInfo)?.dependencies.filter(x => x.pureName == fk.pureName && x.schemaName == fk.schemaName)
            .length >= 2;
        dependencies.push(
          new PerspectiveTableReferenceNode(
            fk,
            tbl,
            db,
            config,
            setConfig,
            dataProvider,
            databaseConfig,
            isMultiple,
            parentColumn
          )
        );
      }
    }
  }
  res.push(..._sortBy(dependencies, 'title'));

  const customs = [];
  for (const join of config.customJoins || []) {
    if (join.baseUniqueName == parentColumn.uniqueName) {
      customs.push(
        new PerspectiveCustomJoinTreeNode(join, db, config, setConfig, dataProvider, databaseConfig, parentColumn)
      );
    }
  }
  res.push(..._sortBy(customs, 'title'));

  return res;
}
