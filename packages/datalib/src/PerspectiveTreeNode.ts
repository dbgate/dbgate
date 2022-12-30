import type {
  CollectionInfo,
  ColumnInfo,
  DatabaseInfo,
  ForeignKeyInfo,
  NamedObjectInfo,
  RangeDefinition,
  TableInfo,
  ViewInfo,
} from 'dbgate-types';
import { equalFullName, isCollectionInfo, isTableInfo, isViewInfo } from 'dbgate-tools';
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
import { getFilterType, parseFilter } from 'dbgate-filterparser';
import { FilterType } from 'dbgate-filterparser/lib/types';
import { Condition, Expression, Select } from 'dbgate-sqltree';
// import { getPerspectiveDefaultColumns } from './getPerspectiveDefaultColumns';
import uuidv1 from 'uuid/v1';
import { PerspectiveDataPatternColumn } from './PerspectiveDataPattern';
import {
  getPerspectiveMostNestedChildColumnName,
  getPerspectiveParentColumnName,
  perspectiveValueMatcher,
} from './perspectiveTools';
import type { PerspectiveTableNode } from './PerspectiveTableNode';
import type { PerspectivePatternColumnNode } from './PerspectivePatternColumnNode';

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
    public databaseConfig: PerspectiveDatabaseConfig,
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
  isTableNode(): this is PerspectiveTableNode {
    return false;
  }
  isPatternTreeNode(): this is PerspectivePatternColumnNode {
    return false;
  }
  get tableNodeOrParent(): PerspectiveTableNode {
    if (this.isTableNode()) {
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
  get filterType(): FilterType {
    return 'string';
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
          .filter(x => x.isPatternTreeNode())
          .filter(x => this.nodeConfig?.checkedColumns?.find(y => y.startsWith(x.codeName + '::')))
          .map(x => x.columnName),
      ])
    );
  }

  getChildrenSqlCondition(source = null): Condition {
    const conditions = _compact([
      ...this.childNodes.map(x => x.parseFilterCondition(source)),
      ...this.buildParentFilterConditions(),
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

  getChildrenMongoCondition(source = null): {} {
    const conditions = _compact([...this.childNodes.map(x => x.parseFilterCondition(source))]);
    if (conditions.length == 0) {
      return null;
    }
    if (conditions.length == 1) {
      return conditions[0];
    }
    return { $and: conditions };
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
  getBaseTableFromThis() {
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
