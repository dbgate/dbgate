import type {
  CollectionInfo,
  ColumnInfo,
  DatabaseInfo,
  FilterBehaviour,
  ForeignKeyInfo,
  NamedObjectInfo,
  RangeDefinition,
  TableInfo,
  ViewInfo,
} from 'dbgate-types';
import {
  detectSqlFilterBehaviour,
  equalFullName,
  isCollectionInfo,
  isTableInfo,
  isViewInfo,
  mongoFilterBehaviour,
  stringFilterBehaviour,
} from 'dbgate-tools';
import {
  ChangePerspectiveConfigFunc,
  createPerspectiveNodeConfig,
  MultipleDatabaseInfo,
  PerspectiveConfig,
  PerspectiveCustomJoinConfig,
  PerspectiveDatabaseConfig,
  PerspectiveDatabaseEngineType,
  PerspectiveFilterColumnInfo,
  PerspectiveNodeConfig,
  PerspectiveReferenceConfig,
} from './PerspectiveConfig';
import _isEqual from 'lodash/isEqual';
import _isArray from 'lodash/isArray';
import _cloneDeep from 'lodash/cloneDeep';
import _compact from 'lodash/compact';
import _uniq from 'lodash/uniq';
import _flatten from 'lodash/flatten';
import _uniqBy from 'lodash/uniqBy';
import _sortBy from 'lodash/sortBy';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import _findIndex from 'lodash/findIndex';
import { PerspectiveDataLoadProps, PerspectiveDataProvider } from './PerspectiveDataProvider';
import stableStringify from 'json-stable-stringify';
import { parseFilter } from 'dbgate-filterparser';
import { CompoudCondition, Condition, Expression, Select } from 'dbgate-sqltree';
// import { getPerspectiveDefaultColumns } from './getPerspectiveDefaultColumns';
import uuidv1 from 'uuid/v1';
import { PerspectiveDataPatternColumn } from './PerspectiveDataPattern';
import {
  getPerspectiveMostNestedChildColumnName,
  getPerspectiveParentColumnName,
  perspectiveValueMatcher,
} from './perspectiveTools';

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
    public dbs: MultipleDatabaseInfo,
    public config: PerspectiveConfig,
    public setConfig: ChangePerspectiveConfigFunc,
    public parentNode: PerspectiveTreeNode,
    public dataProvider: PerspectiveDataProvider,
    public defaultDatabaseConfig: PerspectiveDatabaseConfig,
    public designerId: string
  ) {
    this.nodeConfig = config.nodes.find(x => x.designerId == designerId);
    this.parentNodeConfig = parentNode?.nodeConfig;
  }
  readonly nodeConfig: PerspectiveNodeConfig;
  parentNodeConfig: PerspectiveNodeConfig;
  // defaultChecked: boolean;
  abstract get title();
  abstract get codeName();
  abstract get isExpandable();
  childNodesCache: PerspectiveTreeNode[] = null;
  get childNodes(): PerspectiveTreeNode[] {
    if (!this.childNodesCache) {
      this.childNodesCache = this.generateChildNodes();
    }
    return this.childNodesCache;
  }
  abstract generateChildNodes(): PerspectiveTreeNode[];
  abstract get icon(): string;
  get fieldName() {
    return this.codeName;
  }
  get headerTableAttributes() {
    return null;
  }
  get dataField() {
    return this.codeName;
  }
  get tableCode() {
    return null;
  }
  get namedObject(): NamedObjectInfo {
    return null;
  }
  get tableNodeOrParent(): PerspectiveTableNode {
    if (this instanceof PerspectiveTableNode) {
      return this;
    }
    if (this.parentNode == null) {
      return null;
    }
    return this.parentNode.tableNodeOrParent;
  }
  get engineType(): PerspectiveDatabaseEngineType {
    return null;
  }
  get databaseConfig(): PerspectiveDatabaseConfig {
    const res = { ...this.defaultDatabaseConfig };
    if (this.nodeConfig?.conid) res.conid = this.nodeConfig?.conid;
    if (this.nodeConfig?.database) res.database = this.nodeConfig?.database;
    return res;
  }
  abstract getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps;
  get isRoot() {
    return this.parentNode == null;
  }
  get rootNode(): PerspectiveTreeNode {
    if (this.isRoot) return this;
    return this.parentNode?.rootNode;
  }
  get isSortable() {
    return false;
  }
  get generatesHiearchicGridColumn() {
    return this.isExpandable && this.isCheckedNode;
  }
  get generatesDataGridColumn() {
    return this.isCheckedColumn;
  }
  get validParentDesignerId() {
    if (this.designerId) return this.designerId;
    return this.parentNode?.validParentDesignerId;
  }
  get preloadedLevelData() {
    return false;
  }
  get findByDesignerIdWithoutDesignerId() {
    return false;
  }
  matchChildRow(parentRow: any, childRow: any): boolean {
    return true;
  }

  hasTableCode(code: string) {
    return code == this.tableCode || this.parentNode?.hasTableCode(code);
  }

  // get uniqueName() {
  //   if (this.parentNode) return `${this.parentNode.uniqueName}::${this.codeName}`;
  //   return this.codeName;
  // }
  get level() {
    if (this.parentNode) return this.parentNode.level + 1;
    return 0;
  }
  get isExpanded() {
    return this.parentNodeConfig?.expandedColumns?.includes(this.codeName);
  }
  get isCheckedColumn() {
    if (this.parentNodeConfig?.checkedColumns?.includes(this.codeName)) return true;
    return false;
  }
  get isChecked() {
    return this.isCheckedColumn;
  }
  get isCheckedNode() {
    return !!this.designerId && !!this.config.nodes?.find(x => x.designerId == this.designerId)?.isNodeChecked;
  }
  get isSecondaryChecked() {
    return false;
  }
  get secondaryCheckable() {
    return false;
  }
  get columnTitle() {
    return this.title;
  }
  get filterBehaviour(): FilterBehaviour {
    return stringFilterBehaviour;
  }
  get columnName() {
    return null;
  }
  get customJoinConfig(): PerspectiveCustomJoinConfig {
    return null;
  }
  get db(): DatabaseInfo {
    return this.dbs?.[this.databaseConfig.conid]?.[this.databaseConfig.database];
  }
  get isCircular() {
    return false;
  }

  get pathIdentifier() {
    if (this.parentNode) return `${this.parentNode.pathIdentifier}_${this.codeName}`;
    return this.codeName;
  }

  hasDesignerIdInIncestors(designerId: string): boolean {
    if (designerId == this.designerId) return true;
    return this.parentNode?.hasDesignerIdInIncestors(designerId) || false;
  }

  getChildMatchColumns() {
    return [];
  }

  getParentMatchColumns() {
    return [];
  }

  parseFilterCondition(source = null) {
    return null;
  }

  get hasUncheckedNodeInPath() {
    if (!this.parentNode) return false;
    if (this.designerId && !this.isCheckedNode) return true;
    return this.parentNode.hasUncheckedNodeInPath;
  }

  get childDataColumn() {
    if (this.isCheckedColumn) {
      return this.codeName;
    }
    return null;
  }

  toggleExpanded(value?: boolean) {
    this.includeInNodeSet('expandedColumns', value == null ? !this.isExpanded : value);
  }

  toggleChecked(value?: boolean) {
    this.includeInNodeSet('checkedColumns', value == null ? !this.isChecked : value);
  }

  toggleCheckedNode(value?: boolean) {
    this.setConfig(cfg => {
      const oldCheckedValue = cfg.nodes.find(x => x.designerId == this.designerId)?.isNodeChecked;
      const [cfgChanged, nodeCfg] = this.ensureNodeConfig(cfg);
      const res = {
        ...cfgChanged,
        nodes: cfgChanged.nodes.map(node =>
          node.designerId == (this.designerId || nodeCfg.designerId)
            ? {
                ...node,
                isNodeChecked: value == null ? !oldCheckedValue : value,
              }
            : node
        ),
      };
      return res;
    });
  }

  toggleSecondaryChecked(value?: boolean) {}

  createReferenceConfigColumns(): PerspectiveReferenceConfig['columns'] {
    return null;
  }

  ensureNodeConfig(cfg: PerspectiveConfig): [PerspectiveConfig, PerspectiveNodeConfig] {
    let node = cfg.nodes.find(x => x.designerId == this.designerId);
    if (!node) {
      const nodeConfig: PerspectiveNodeConfig = {
        ...createPerspectiveNodeConfig(this.namedObject),
        isAutoGenerated: true,
        conid: this.parentNodeConfig?.conid,
        database: this.parentNodeConfig?.database,
      };
      const refConfig: PerspectiveReferenceConfig = {
        designerId: uuidv1(),
        sourceId: this.parentNode.designerId,
        targetId: nodeConfig.designerId,
        isAutoGenerated: true,
        columns: this.createReferenceConfigColumns(),
      };
      return [
        {
          ...cfg,
          nodes: [...cfg.nodes, nodeConfig],
          references: [...cfg.references, refConfig],
        },
        nodeConfig,
      ];
    }
    return [cfg, node];
  }

  includeInNodeSet(field: 'expandedColumns' | 'uncheckedColumns' | 'checkedColumns', isIncluded: boolean) {
    this.setConfig(cfg => {
      const changedFields = n => ({
        ...n,
        [field]: isIncluded ? [...(n[field] || []), this.codeName] : (n[field] || []).filter(x => x != this.codeName),
      });

      const [cfgChanged, nodeCfg] = this.parentNode?.tableNodeOrParent?.ensureNodeConfig(cfg);

      const res = {
        ...cfgChanged,
        nodes: cfgChanged.nodes.map(n =>
          n.designerId == (this.parentNode?.tableNodeOrParent?.designerId || nodeCfg?.designerId) ? changedFields(n) : n
        ),
      };
      return res;
    });
  }

  getFilter() {
    return this.parentNodeConfig?.filters?.[this.codeName];
  }

  getDataLoadColumns() {
    return _compact(
      _uniq([
        ...this.childNodes.map(x => x.childDataColumn),
        ..._flatten(this.childNodes.filter(x => x.isExpandable && x.isChecked).map(x => x.getChildMatchColumns())),
        ...this.getParentMatchColumns(),
        ...this.childNodes
          .filter(x => x instanceof PerspectivePatternColumnNode)
          .filter(x => this.nodeConfig?.checkedColumns?.find(y => y.startsWith(x.codeName + '::')))
          .map(x => x.columnName),
      ])
    );
  }

  getMutliColumnCondition(source): Condition {
    if (!this.nodeConfig?.multiColumnFilter) return null;

    const base = this.getBaseTableFromThis() as TableInfo | ViewInfo | CollectionInfo;
    if (!base) return null;

    const isDocDb = isCollectionInfo(base);
    if (isDocDb) {
      return this.getMutliColumnNoSqlCondition();
    } else {
      return this.getMutliColumnSqlCondition(source);
    }
  }

  getMutliColumnSqlCondition(source): Condition {
    if (!this.nodeConfig?.multiColumnFilter) return null;

    const base = this.getBaseTableFromThis() as TableInfo | ViewInfo;
    if (!base) return null;
    try {
      const condition = parseFilter(this.nodeConfig?.multiColumnFilter, stringFilterBehaviour);
      if (condition) {
        const orCondition: CompoudCondition = {
          conditionType: 'or',
          conditions: [],
        };
        for (const column of base.columns || []) {
          orCondition.conditions.push(
            _cloneDeepWith(condition, (expr: Expression) => {
              if (expr.exprType == 'placeholder') {
                return {
                  exprType: 'column',
                  alias: source,
                  columnName: column.columnName,
                };
              }
            })
          );
        }
        if (orCondition.conditions.length > 0) {
          return orCondition;
        }
      }
    } catch (err) {
      console.warn(err.message);
    }
    return null;
  }

  getMutliColumnNoSqlCondition(): Condition {
    if (!this.nodeConfig?.multiColumnFilter) return null;
    const pattern = this.dataProvider?.dataPatterns?.[this.designerId];
    if (!pattern) return null;

    const condition = parseFilter(this.nodeConfig?.multiColumnFilter, mongoFilterBehaviour);
    if (!condition) return null;

    const orCondition: CompoudCondition = {
      conditionType: 'or',
      conditions: [],
    };
    for (const column of pattern.columns || []) {
      orCondition.conditions.push(
        _cloneDeepWith(condition, (expr: Expression) => {
          if (expr.exprType == 'placeholder') {
            return {
              exprType: 'column',
              columnName: column.name,
            };
          }
        })
      );
    }
    if (orCondition.conditions.length > 0) {
      return orCondition;
    }
  }

  getChildrenSqlCondition(source = null): Condition {
    const conditions = _compact([
      ...this.childNodes.map(x => x.parseFilterCondition(source)),
      ...this.buildParentFilterConditions(),
      this.getMutliColumnCondition(source),
    ]);
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

  getOrderBy(table: TableInfo | ViewInfo | CollectionInfo): PerspectiveDataLoadProps['orderBy'] {
    const res = _compact(
      this.childNodes.map(node => {
        const sort = this.nodeConfig?.sort?.find(x => x.columnName == node.columnName);
        if (sort) {
          return {
            columnName: node.columnName,
            order: sort.order,
          };
        }
      })
    );
    if (res.length > 0) return res;
    const pkColumns = (table as TableInfo)?.primaryKey?.columns.map(x => ({
      columnName: x.columnName,
      order: 'ASC' as 'ASC',
    }));
    if (pkColumns) return pkColumns;
    const uqColumns = (table as CollectionInfo)?.uniqueKey;
    if (uqColumns?.length >= 1) return uqColumns.map(x => ({ columnName: x.columnName, order: 'ASC' }));
    const columns = (table as TableInfo | ViewInfo)?.columns;
    if (columns) return [{ columnName: columns[0].columnName, order: 'ASC' }];
    return [{ columnName: '_id', order: 'ASC' }];
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
  getBaseTableFromThis(): TableInfo | ViewInfo | CollectionInfo {
    return null;
  }

  get filterInfo(): PerspectiveFilterColumnInfo {
    return null;
  }

  findChildNodeByUniquePath(uniquePath: string[]) {
    if (uniquePath.length == 0) {
      return this;
    }
    const child = this.childNodes.find(x => x.codeName == uniquePath[0]);
    return child?.findChildNodeByUniquePath(uniquePath.slice(1));
  }

  // findNodeByUniqueName(uniqueName: string): PerspectiveTreeNode {
  //   if (!uniqueName) return null;
  //   const uniquePath = uniqueName.split('::');
  //   if (uniquePath[0] != this.codeName) return null;
  //   return this.findChildNodeByUniquePath(uniquePath.slice(1));
  // }

  findNodeByDesignerId(designerId: string): PerspectiveTreeNode {
    if (!this.designerId && !this.findByDesignerIdWithoutDesignerId) {
      return null;
    }
    if (!designerId) {
      return null;
    }
    if (designerId == this.designerId) {
      return this;
    }

    for (const child of this.childNodes) {
      const res = child.findNodeByDesignerId(designerId);
      if (res) {
        return res;
      }
    }

    return null;
  }

  get supportsParentFilter() {
    return (
      (this.parentNode?.isRoot || this.parentNode?.supportsParentFilter) &&
      this.parentNode?.databaseConfig?.conid == this.databaseConfig?.conid &&
      this.parentNode?.databaseConfig?.database == this.databaseConfig?.database &&
      this.engineType == 'sqldb' &&
      this.parentNode?.engineType == 'sqldb'
    );
  }

  get isParentFilter() {
    return !!this.nodeConfig?.isParentFilter;
  }

  buildParentFilterConditions(): Condition[] {
    const leafNodes = _compact(
      (this.config?.nodes || [])
        .filter(x => x.isParentFilter)
        .map(x => this.rootNode.findNodeByDesignerId(x.designerId))
    );
    const conditions: Condition[] = _compact(
      leafNodes.map(leafNode => {
        if (leafNode == this) return null;
        const select: Select = {
          commandType: 'select',
          from: {
            name: leafNode.namedObject,
            alias: 'pert_0',
            relations: [],
          },
          selectAll: true,
        };
        let lastNode = leafNode;
        let node = leafNode;
        let index = 1;
        let lastAlias = 'pert_0';
        while (node?.parentNode && node?.parentNode?.designerId != this?.designerId) {
          node = node.parentNode;
          let alias = `pert_${index}`;
          select.from.relations.push({
            joinType: 'INNER JOIN',
            alias,
            name: node.namedObject,
            conditions: lastNode.getParentJoinCondition(lastAlias, alias),
          });
          lastAlias = alias;
          lastNode = node;
          index += 1;
        }
        if (node?.parentNode?.designerId != this?.designerId) return null;
        select.where = {
          conditionType: 'and',
          conditions: _compact([
            ...lastNode.getParentJoinCondition(lastAlias, this.namedObject.pureName),
            leafNode.getChildrenSqlCondition({ alias: 'pert_0' }),
          ]),
        };

        return {
          conditionType: 'exists',
          subQuery: select,
        };
      })
    );
    return conditions;
  }

  getParentJoinCondition(alias: string, parentAlias: string): Condition[] {
    return [];
  }

  get sortOrder() {
    return this.parentNodeConfig?.sort?.find(x => x.columnName == this.columnName)?.order;
  }

  get sortOrderIndex() {
    return this.parentNodeConfig?.sort?.length > 1
      ? _findIndex(this.parentNodeConfig?.sort, x => x.columnName == this.columnName)
      : -1;
  }
}

export class PerspectiveTableColumnNode extends PerspectiveTreeNode {
  foreignKey: ForeignKeyInfo;
  refTable: TableInfo;
  isView: boolean;
  isTable: boolean;
  constructor(
    public column: ColumnInfo,
    public table: TableInfo | ViewInfo,
    dbs: MultipleDatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    dataProvider: PerspectiveDataProvider,
    defaultDatabaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(dbs, config, setConfig, parentNode, dataProvider, defaultDatabaseConfig, designerId);

    this.isTable = !!this.db?.tables?.find(x => x.schemaName == table.schemaName && x.pureName == table.pureName);
    this.isView = !!this.db?.views?.find(x => x.schemaName == table.schemaName && x.pureName == table.pureName);

    this.foreignKey = (table as TableInfo)?.foreignKeys?.find(
      fk => fk.columns.length == 1 && fk.columns[0].columnName == column.columnName
    );

    this.refTable = this.db.tables.find(
      x => x.pureName == this.foreignKey?.refTableName && x.schemaName == this.foreignKey?.refSchemaName
    );
  }

  get engineType() {
    return this.parentNode.engineType;
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

  getParentJoinCondition(alias: string, parentAlias: string): Condition[] {
    if (!this.foreignKey) return [];
    return this.foreignKey.columns.map(column => {
      const res: Condition = {
        conditionType: 'binary',
        operator: '=',
        left: {
          exprType: 'column',
          columnName: column.columnName,
          source: { alias: parentAlias },
        },
        right: {
          exprType: 'column',
          columnName: column.refColumnName,
          source: { alias },
        },
      };
      return res;
    });
  }

  createReferenceConfigColumns(): PerspectiveReferenceConfig['columns'] {
    return this.foreignKey?.columns?.map(col => ({
      source: col.columnName,
      target: col.refColumnName,
    }));
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
      sqlCondition: this.getChildrenSqlCondition(),
      engineType: 'sqldb',
    };
  }

  get icon() {
    if (this.isCircular) return 'img circular';
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
    // return this.codeName ;
  }

  get title() {
    return this.column.columnName;
  }

  get isExpandable() {
    return !!this.foreignKey;
  }

  get isSortable() {
    return true;
  }

  get filterBehaviour(): FilterBehaviour {
    return detectSqlFilterBehaviour(this.column.dataType);
  }

  get isCircular() {
    return !!this.parentNode?.parentNode?.hasTableCode(this.tableCode);
  }

  get isSecondaryChecked() {
    return super.isCheckedColumn;
  }
  get isChecked() {
    if (this.foreignKey) return this.isCheckedNode;
    return super.isCheckedColumn;
  }
  get secondaryCheckable() {
    return !!this.foreignKey;
  }
  toggleChecked(value?: boolean) {
    if (this.foreignKey) {
      this.toggleCheckedNode(value);
    } else {
      super.toggleChecked(value);
    }
  }
  toggleSecondaryChecked(value?: boolean) {
    super.toggleChecked(value == null ? !this.isSecondaryChecked : value);
  }

  generateChildNodes(): PerspectiveTreeNode[] {
    if (!this.foreignKey) return [];
    const tbl = this?.db?.tables?.find(
      x => x.pureName == this.foreignKey?.refTableName && x.schemaName == this.foreignKey?.refSchemaName
    );

    return getTableChildPerspectiveNodes(
      tbl,
      this.dbs,
      this.config,
      this.setConfig,
      this.dataProvider,
      this.defaultDatabaseConfig,
      this
    );
  }

  getBaseTableFromThis() {
    return this.refTable;
  }

  get filterInfo(): PerspectiveFilterColumnInfo {
    return {
      columnName: this.columnName,
      filterBehaviour: this.filterBehaviour,
      pureName: this.column.pureName,
      schemaName: this.column.schemaName,
      foreignKey: this.foreignKey,
    };
  }

  parseFilterCondition(source = null): Condition {
    const filter = this.getFilter();
    if (!filter) return null;
    const condition = parseFilter(filter, this.filterBehaviour);
    if (!condition) return null;
    return _cloneDeepWith(condition, (expr: Expression) => {
      if (expr.exprType == 'placeholder') {
        return {
          exprType: 'column',
          columnName: this.column.columnName,
          source,
        };
      }
    });
  }

  get headerTableAttributes() {
    if (this.foreignKey) {
      return {
        schemaName: this.foreignKey.refSchemaName,
        pureName: this.foreignKey.refTableName,
        conid: this.databaseConfig.conid,
        database: this.databaseConfig.database,
        objectTypeField: this.table.objectTypeField,
      };
    }
    return null;
  }

  get tableCode() {
    if (this.foreignKey) {
      return `${this.foreignKey.refSchemaName}|${this.foreignKey.refTableName}`;
    }
    return `${this.table.schemaName}|${this.table.pureName}`;
  }

  get namedObject(): NamedObjectInfo {
    if (this.foreignKey) {
      return {
        schemaName: this.foreignKey.refSchemaName,
        pureName: this.foreignKey.refTableName,
      };
    }
    return null;
  }
}

export class PerspectivePatternColumnNode extends PerspectiveTreeNode {
  foreignKey: ForeignKeyInfo;
  refTable: TableInfo;

  constructor(
    public table: TableInfo | ViewInfo | CollectionInfo,
    public column: PerspectiveDataPatternColumn,
    public tableColumn: ColumnInfo,
    dbs: MultipleDatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    dataProvider: PerspectiveDataProvider,
    defaultDatabaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(dbs, config, setConfig, parentNode, dataProvider, defaultDatabaseConfig, designerId);
    this.parentNodeConfig = this.tableNodeOrParent?.nodeConfig;
    // console.log('PATTERN COLUMN', column);
  }

  get isChildColumn() {
    return this.parentNode instanceof PerspectivePatternColumnNode;
  }

  get findByDesignerIdWithoutDesignerId() {
    return this.isExpandable;
  }

  // matchChildRow(parentRow: any, childRow: any): boolean {
  //   console.log('MATCH PATTENR ROW', parentRow, childRow);
  //   return false;
  //   // if (!this.foreignKey) return false;
  //   // return parentRow[this.foreignKey.columns[0].columnName] == childRow[this.foreignKey.columns[0].refColumnName];
  // }

  // getChildMatchColumns() {
  //   if (!this.foreignKey) return [];
  //   return [this.foreignKey.columns[0].columnName];
  // }

  // getParentMatchColumns() {
  //   if (!this.foreignKey) return [];
  //   return [this.foreignKey.columns[0].refColumnName];
  // }

  // getParentJoinCondition(alias: string, parentAlias: string): Condition[] {
  //   if (!this.foreignKey) return [];
  //   return this.foreignKey.columns.map(column => {
  //     const res: Condition = {
  //       conditionType: 'binary',
  //       operator: '=',
  //       left: {
  //         exprType: 'column',
  //         columnName: column.columnName,
  //         source: { alias: parentAlias },
  //       },
  //       right: {
  //         exprType: 'column',
  //         columnName: column.refColumnName,
  //         source: { alias },
  //       },
  //     };
  //     return res;
  //   });
  // }

  // createReferenceConfigColumns(): PerspectiveReferenceConfig['columns'] {
  //   return this.foreignKey?.columns?.map(col => ({
  //     source: col.columnName,
  //     target: col.refColumnName,
  //   }));
  // }

  getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps {
    // console.log('GETTING PATTERN', parentRows);
    return null;
  }

  get generatesHiearchicGridColumn(): boolean {
    // return true;
    // console.log('generatesHiearchicGridColumn', this.parentTableNode?.nodeConfig?.checkedColumns, this.codeName + '::');
    if (this.tableNodeOrParent?.nodeConfig?.checkedColumns?.find(x => x.startsWith(this.codeName + '::'))) {
      return true;
    }
    // return false;

    return this.hasCheckedJoinChild();
  }

  // get generatesHiearchicGridColumn() {
  //   // return this.config &&;
  // }

  get icon() {
    if (this.column.types.includes('json')) {
      return 'img json';
    }
    return 'img column';
  }

  get codeName() {
    if (this.parentNode instanceof PerspectivePatternColumnNode) {
      return `${this.parentNode.codeName}::${this.column.name}`;
    }
    return this.column.name;
  }

  get columnName() {
    return this.column.name;
  }

  get fieldName() {
    return this.column.name;
  }

  get title() {
    return this.column.name;
  }

  get isExpandable() {
    return this.column.columns.length > 0;
  }

  get isSortable() {
    return !this.isChildColumn;
  }

  get filterBehaviour(): FilterBehaviour {
    if (this.tableColumn) return detectSqlFilterBehaviour(this.tableColumn.dataType);
    return mongoFilterBehaviour;
  }

  get preloadedLevelData() {
    return true;
  }

  generatePatternChildNodes(): PerspectivePatternColumnNode[] {
    return this.column.columns.map(
      column =>
        new PerspectivePatternColumnNode(
          this.table,
          column,
          this.tableColumn,
          this.dbs,
          this.config,
          this.setConfig,
          this.dataProvider,
          this.defaultDatabaseConfig,
          this,
          null
        )
    );
  }

  hasCheckedJoinChild() {
    for (const node of this.childNodes) {
      if (node instanceof PerspectivePatternColumnNode) {
        if (node.hasCheckedJoinChild()) return true;
      }
      if (node.isCheckedNode) return true;
    }
    return false;
  }

  generateChildNodes(): PerspectiveTreeNode[] {
    const patternChildren = this.generatePatternChildNodes();

    const customs = [];
    // console.log('GETTING CHILDREN', this.config.nodes, this.config.references);
    for (const node of this.config.nodes) {
      for (const ref of this.config.references) {
        const validDesignerId = this.validParentDesignerId;
        if (
          (ref.sourceId == validDesignerId && ref.targetId == node.designerId) ||
          (ref.targetId == validDesignerId && ref.sourceId == node.designerId)
        ) {
          // console.log('TESTING REF', ref, this.codeName);
          if (ref.columns.length != 1) continue;
          // console.log('CP1');
          if (
            ref.sourceId == validDesignerId &&
            this.codeName == getPerspectiveParentColumnName(ref.columns[0].source)
          ) {
            if (ref.columns[0].target.includes('::')) continue;
          } else if (
            ref.targetId == validDesignerId &&
            this.codeName == getPerspectiveParentColumnName(ref.columns[0].target)
          ) {
            if (ref.columns[0].source.includes('::')) continue;
          } else {
            continue;
          }
          // console.log('CP2');

          const newConfig: PerspectiveDatabaseConfig = { ...this.defaultDatabaseConfig };
          if (node.conid) newConfig.conid = node.conid;
          if (node.database) newConfig.database = node.database;
          const db = this.dbs?.[newConfig.conid]?.[newConfig.database];
          const table = db?.tables?.find(x => x.pureName == node.pureName && x.schemaName == node.schemaName);
          const view = db?.views?.find(x => x.pureName == node.pureName && x.schemaName == node.schemaName);
          const collection = db?.collections?.find(x => x.pureName == node.pureName && x.schemaName == node.schemaName);

          const join: PerspectiveCustomJoinConfig = {
            refNodeDesignerId: node.designerId,
            referenceDesignerId: ref.designerId,
            baseDesignerId: validDesignerId,
            joinName: node.alias,
            refTableName: node.pureName,
            refSchemaName: node.schemaName,
            conid: node.conid,
            database: node.database,
            columns:
              ref.sourceId == validDesignerId
                ? ref.columns.map(col => ({ baseColumnName: col.source, refColumnName: col.target }))
                : ref.columns.map(col => ({ baseColumnName: col.target, refColumnName: col.source })),
          };

          if (table || view || collection) {
            customs.push(
              new PerspectiveCustomJoinTreeNode(
                join,
                table || view || collection,
                this.dbs,
                this.config,
                this.setConfig,
                this.dataProvider,
                this.defaultDatabaseConfig,
                this,
                node.designerId
              )
            );
          }
        }
      }
    }

    return [...patternChildren, ...customs];
    // return [];
    // if (!this.foreignKey) return [];
    // const tbl = this?.db?.tables?.find(
    //   x => x.pureName == this.foreignKey?.refTableName && x.schemaName == this.foreignKey?.refSchemaName
    // );

    // return getTableChildPerspectiveNodes(
    //   tbl,
    //   this.dbs,
    //   this.config,
    //   this.setConfig,
    //   this.dataProvider,
    //   this.databaseConfig,
    //   this
    // );
  }

  get filterInfo(): PerspectiveFilterColumnInfo {
    if (this.isChildColumn) {
      return null;
    }

    return {
      columnName: this.columnName,
      filterBehaviour: this.filterBehaviour,
      pureName: this.table.pureName,
      schemaName: this.table.schemaName,
      foreignKey: this.foreignKey,
    };
  }

  parseFilterCondition(source = null): {} {
    const filter = this.getFilter();
    if (!filter) return null;
    const condition = parseFilter(filter, mongoFilterBehaviour);
    if (!condition) return null;
    return _cloneDeepWith(condition, expr => {
      if (expr.__placeholder__) {
        return {
          [this.columnName]: expr.__placeholder__,
        };
      }
    });
  }

  // get headerTableAttributes() {
  //   if (this.foreignKey) {
  //     return {
  //       schemaName: this.foreignKey.refSchemaName,
  //       pureName: this.foreignKey.refTableName,
  //       conid: this.databaseConfig.conid,
  //       database: this.databaseConfig.database,
  //     };
  //   }
  //   return null;
  // }

  // get tableCode() {
  //   return `${this.collection.schemaName}|${this.table.pureName}`;
  // }

  // get namedObject(): NamedObjectInfo {
  //   if (this.foreignKey) {
  //     return {
  //       schemaName: this.foreignKey.refSchemaName,
  //       pureName: this.foreignKey.refTableName,
  //     };
  //   }
  //   return null;
  // }
}

export class PerspectiveTableNode extends PerspectiveTreeNode {
  constructor(
    public table: TableInfo | ViewInfo | CollectionInfo,
    dbs: MultipleDatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    defaultDatabaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(dbs, config, setConfig, parentNode, dataProvider, defaultDatabaseConfig, designerId);
  }

  get engineType(): PerspectiveDatabaseEngineType {
    return isCollectionInfo(this.table) ? 'docdb' : 'sqldb';
  }

  getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps {
    const isDocDb = isCollectionInfo(this.table);
    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
      dataColumns: this.getDataLoadColumns(),
      allColumns: isDocDb,
      databaseConfig: this.databaseConfig,
      orderBy: this.getOrderBy(this.table),
      sqlCondition: this.getChildrenSqlCondition(),
      engineType: isDocDb ? 'docdb' : 'sqldb',
    };
  }

  get codeName() {
    return this.table.schemaName ? `${this.table.schemaName}:${this.table.pureName}` : this.table.pureName;
  }

  get title() {
    return this.nodeConfig?.alias || this.table.pureName;
  }

  get isExpandable() {
    return true;
  }

  generateChildNodes(): PerspectiveTreeNode[] {
    return getTableChildPerspectiveNodes(
      this.table,
      this.dbs,
      this.config,
      this.setConfig,
      this.dataProvider,
      this.defaultDatabaseConfig,
      this
    );
  }

  get icon() {
    return 'img table';
  }

  getBaseTableFromThis() {
    return this.table;
  }

  get headerTableAttributes() {
    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
      conid: this.databaseConfig.conid,
      database: this.databaseConfig.database,
      objectTypeField: this.table.objectTypeField,
    };
  }

  get tableCode() {
    return `${this.table.schemaName}|${this.table.pureName}`;
  }

  get namedObject(): NamedObjectInfo {
    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
    };
  }
}
export class PerspectiveTableReferenceNode extends PerspectiveTableNode {
  constructor(
    public foreignKey: ForeignKeyInfo,
    table: TableInfo,
    dbs: MultipleDatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    defaultDatabaseConfig: PerspectiveDatabaseConfig,
    public isMultiple: boolean,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(table, dbs, config, setConfig, dataProvider, defaultDatabaseConfig, parentNode, designerId);
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
      sqlCondition: this.getChildrenSqlCondition(),
      engineType: 'sqldb',
    };
  }

  createReferenceConfigColumns(): PerspectiveReferenceConfig['columns'] {
    return this.foreignKey?.columns?.map(col => ({
      source: col.refColumnName,
      target: col.columnName,
    }));
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

  get isChecked() {
    return this.isCheckedNode;
  }

  toggleChecked(value?: boolean) {
    this.toggleCheckedNode(value);
  }

  getParentJoinCondition(alias: string, parentAlias: string): Condition[] {
    if (!this.foreignKey) return [];
    return this.foreignKey.columns.map(column => {
      const res: Condition = {
        conditionType: 'binary',
        operator: '=',
        left: {
          exprType: 'column',
          columnName: column.refColumnName,
          source: { alias: parentAlias },
        },
        right: {
          exprType: 'column',
          columnName: column.columnName,
          source: { alias },
        },
      };
      return res;
    });
  }
}

export class PerspectiveCustomJoinTreeNode extends PerspectiveTableNode {
  constructor(
    public customJoin: PerspectiveCustomJoinConfig,
    table: TableInfo | ViewInfo | CollectionInfo,
    dbs: MultipleDatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    defaultDatabaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(table, dbs, config, setConfig, dataProvider, defaultDatabaseConfig, parentNode, designerId);
  }

  matchChildRow(parentRow: any, childRow: any): boolean {
    // console.log('MATCH ROW', parentRow, childRow);
    for (const column of this.customJoin.columns) {
      if (
        !perspectiveValueMatcher(
          parentRow[getPerspectiveMostNestedChildColumnName(column.baseColumnName)],
          childRow[column.refColumnName]
        )
      ) {
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
    // console.log('PARENT ROWS', parentRows);

    // console.log('this.getDataLoadColumns()', this.getDataLoadColumns());
    const isDocDb = isCollectionInfo(this.table);

    // const bindingValues = [];

    // for (const row of parentRows) {
    //   const rowBindingValueArrays = [];
    //   for (const col of this.customJoin.columns) {
    //     const path = col.baseColumnName.split('::');
    //     const values = [];

    //     function processSubpath(parent, subpath) {
    //       if (subpath.length == 0) {
    //         values.push(parent);
    //         return;
    //       }
    //       if (parent == null) {
    //         return;
    //       }

    //       const obj = parent[subpath[0]];
    //       if (_isArray(obj)) {
    //         for (const elem of obj) {
    //           processSubpath(elem, subpath.slice(1));
    //         }
    //       } else {
    //         processSubpath(obj, subpath.slice(1));
    //       }
    //     }

    //     processSubpath(row, path);

    //     rowBindingValueArrays.push(values);
    //   }

    //   const valueCount = Math.max(...rowBindingValueArrays.map(x => x.length));

    //   for (let i = 0; i < valueCount; i += 1) {
    //     const value = Array(this.customJoin.columns.length);
    //     for (let col = 0; col < this.customJoin.columns.length; col++) {
    //       value[col] = rowBindingValueArrays[col][i % rowBindingValueArrays[col].length];
    //     }
    //     bindingValues.push(value);
    //   }
    // }
    const bindingValues = parentRows.map(row =>
      this.customJoin.columns.map(x => row[getPerspectiveMostNestedChildColumnName(x.baseColumnName)])
    );

    // console.log('bindingValues', bindingValues);
    // console.log(
    //   'bindingValues UNIQ',
    //   _uniqBy(bindingValues, x => JSON.stringify(x))
    // );

    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
      bindingColumns: this.getParentMatchColumns(),
      bindingValues: _uniqBy(bindingValues, x => JSON.stringify(x)),
      dataColumns: this.getDataLoadColumns(),
      allColumns: isDocDb,
      databaseConfig: this.databaseConfig,
      orderBy: this.getOrderBy(this.table),
      sqlCondition: this.getChildrenSqlCondition(),
      // mongoCondition: isMongo ? this.getChildrenMongoCondition() : null,
      engineType: isDocDb ? 'docdb' : 'sqldb',
    };
  }

  // get title() {
  //   return this.customJoin.joinName || this.customJoin.refTableName;
  // }

  get icon() {
    return 'icon custom-join';
  }

  get codeName() {
    return this.customJoin.refNodeDesignerId;
  }

  get customJoinConfig(): PerspectiveCustomJoinConfig {
    return this.customJoin;
  }

  get isChecked() {
    return this.isCheckedNode;
  }

  toggleChecked(value?: boolean) {
    this.toggleCheckedNode(value);
  }

  getParentJoinCondition(alias: string, parentAlias: string): Condition[] {
    return this.customJoin.columns.map(column => {
      const res: Condition = {
        conditionType: 'binary',
        operator: '=',
        left: {
          exprType: 'column',
          columnName: column.baseColumnName,
          source: { alias: parentAlias },
        },
        right: {
          exprType: 'column',
          columnName: column.refColumnName,
          source: { alias },
        },
      };
      return res;
    });
  }
}

function findDesignerIdForNode<T extends PerspectiveTreeNode>(
  config: PerspectiveConfig,
  parentNode: PerspectiveTreeNode,
  nodeCreateFunc: (designerId: string) => T
): T {
  const node = nodeCreateFunc(null);
  const refColumns = node.createReferenceConfigColumns();
  if (!refColumns?.length) {
    return node;
  }
  const ref1 = config.references.find(
    x =>
      x.sourceId == parentNode.designerId &&
      _isEqual(
        refColumns.map(x => x.source),
        x.columns.map(x => x.source)
      ) &&
      _isEqual(
        refColumns.map(x => x.target),
        x.columns.map(x => x.target)
      ) &&
      equalFullName(
        config.nodes.find(n => n.designerId == x.targetId),
        node.namedObject
      )
  );
  if (ref1 && !parentNode.hasDesignerIdInIncestors(ref1.targetId)) {
    // console.log('FOUND1', node.title, ref1.targetId, refColumns);
    return nodeCreateFunc(ref1.targetId);
  }

  const ref2 = config.references.find(
    x =>
      x.targetId == parentNode.designerId &&
      _isEqual(
        refColumns.map(x => x.target),
        x.columns.map(x => x.source)
      ) &&
      _isEqual(
        refColumns.map(x => x.source),
        x.columns.map(x => x.target)
      ) &&
      equalFullName(
        config.nodes.find(n => n.designerId == x.sourceId),
        node.namedObject
      )
  );
  if (ref2 && !parentNode.hasDesignerIdInIncestors(ref2.sourceId)) {
    // console.log('FOUND2', node.title, ref2.sourceId, refColumns);
    return nodeCreateFunc(ref2.sourceId);
  }

  return node;
}

export function getTableChildPerspectiveNodes(
  table: TableInfo | ViewInfo | CollectionInfo,
  dbs: MultipleDatabaseInfo,
  config: PerspectiveConfig,
  setConfig: ChangePerspectiveConfigFunc,
  dataProvider: PerspectiveDataProvider,
  defaultDatabaseConfig: PerspectiveDatabaseConfig,
  parentNode: PerspectiveTreeNode
) {
  if (!table) return [];
  const db = parentNode.db;

  const pattern = dataProvider?.dataPatterns?.[parentNode.designerId];

  const tableOrView = isTableInfo(table) || isViewInfo(table) ? table : null;

  const columnNodes =
    tableOrView?.columns?.map(col =>
      findDesignerIdForNode(config, parentNode, designerId =>
        pattern?.columns?.find(x => x.name == col.columnName)?.types.includes('json')
          ? new PerspectivePatternColumnNode(
              table,
              pattern?.columns?.find(x => x.name == col.columnName),
              col,
              dbs,
              config,
              setConfig,
              dataProvider,
              defaultDatabaseConfig,
              parentNode,
              designerId
            )
          : new PerspectiveTableColumnNode(
              col,
              tableOrView,
              dbs,
              config,
              setConfig,
              dataProvider,
              defaultDatabaseConfig,
              parentNode,
              designerId
            )
      )
    ) ||
    pattern?.columns?.map(col =>
      findDesignerIdForNode(
        config,
        parentNode,
        designerId =>
          new PerspectivePatternColumnNode(
            table,
            col,
            null,
            dbs,
            config,
            setConfig,
            dataProvider,
            defaultDatabaseConfig,
            parentNode,
            designerId
          )
      )
    ) ||
    [];
  // if (!columnNodes.find(x => x.isChecked)) {
  //   const circularColumns = columnNodes.filter(x => x.isCircular).map(x => x.columnName);
  //   const defaultColumns = getPerspectiveDefaultColumns(table, db, circularColumns);
  //   for (const node of columnNodes) {
  //     if (defaultColumns.includes(node.columnName)) {
  //       no
  //     }
  //   }
  // }

  const res = [];
  res.push(...columnNodes);
  const dependencies = [];
  if (db && (table as TableInfo)?.dependencies) {
    for (const fk of (table as TableInfo)?.dependencies) {
      const tbl = db.tables.find(x => x.pureName == fk.pureName && x.schemaName == fk.schemaName);
      if (tbl) {
        const isMultiple =
          (table as TableInfo)?.dependencies.filter(x => x.pureName == fk.pureName && x.schemaName == fk.schemaName)
            .length >= 2;
        dependencies.push(
          findDesignerIdForNode(
            config,
            parentNode,
            designerId =>
              new PerspectiveTableReferenceNode(
                fk,
                tbl,
                dbs,
                config,
                setConfig,
                dataProvider,
                defaultDatabaseConfig,
                isMultiple,
                parentNode,
                designerId
              )
          )
        );
      }
    }
  }
  res.push(..._sortBy(dependencies, 'title'));

  const customs = [];
  for (const node of config.nodes) {
    if (node.designerId == parentNode.parentNode?.designerId || res.find(x => x.designerId == node.designerId)) {
      // already used as FK
      continue;
    }
    for (const ref of config.references) {
      if (
        (ref.sourceId == parentNode.designerId && ref.targetId == node.designerId) ||
        (ref.targetId == parentNode.designerId && ref.sourceId == node.designerId)
      ) {
        if (ref.columns.find(x => x.source.includes('::') || x.target.includes('::'))) {
          continue;
        }
        const newConfig: PerspectiveDatabaseConfig = { ...defaultDatabaseConfig };
        if (node.conid) newConfig.conid = node.conid;
        if (node.database) newConfig.database = node.database;
        const db = dbs?.[newConfig.conid]?.[newConfig.database];
        const table = db?.tables?.find(x => x.pureName == node.pureName && x.schemaName == node.schemaName);
        const view = db?.views?.find(x => x.pureName == node.pureName && x.schemaName == node.schemaName);
        const collection = db?.collections?.find(x => x.pureName == node.pureName && x.schemaName == node.schemaName);

        const join: PerspectiveCustomJoinConfig = {
          refNodeDesignerId: node.designerId,
          referenceDesignerId: ref.designerId,
          baseDesignerId: parentNode.designerId,
          joinName: node.alias,
          refTableName: node.pureName,
          refSchemaName: node.schemaName,
          conid: node.conid,
          database: node.database,
          columns:
            ref.sourceId == parentNode.designerId
              ? ref.columns.map(col => ({ baseColumnName: col.source, refColumnName: col.target }))
              : ref.columns.map(col => ({ baseColumnName: col.target, refColumnName: col.source })),
        };

        if (table || view || collection) {
          customs.push(
            new PerspectiveCustomJoinTreeNode(
              join,
              table || view || collection,
              dbs,
              config,
              setConfig,
              dataProvider,
              defaultDatabaseConfig,
              parentNode,
              node.designerId
            )
          );
        }
      }
    }
  }

  res.push(..._sortBy(customs, 'title'));

  return res;
}
