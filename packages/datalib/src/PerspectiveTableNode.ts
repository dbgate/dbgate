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
  getTableChildPerspectiveNodes,
} from './perspectiveTools';
import { PerspectiveTreeNode } from './PerspectiveTreeNode';

export class PerspectiveTableNode extends PerspectiveTreeNode {
  constructor(
    public table: TableInfo | ViewInfo | CollectionInfo,
    dbs: MultipleDatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(dbs, config, setConfig, parentNode, dataProvider, databaseConfig, designerId);
  }

  get engineType(): PerspectiveDatabaseEngineType {
    return isCollectionInfo(this.table) ? 'docdb' : 'sqldb';
  }

  isTableNode() {
    return true;
  }

  getNodeLoadProps(parentRows: any[]): PerspectiveDataLoadProps {
    const isMongo = isCollectionInfo(this.table);
    return {
      schemaName: this.table.schemaName,
      pureName: this.table.pureName,
      dataColumns: this.getDataLoadColumns(),
      allColumns: isMongo,
      databaseConfig: this.databaseConfig,
      orderBy: this.getOrderBy(this.table),
      sqlCondition: isMongo ? null : this.getChildrenSqlCondition(),
      mongoCondition: isMongo ? this.getChildrenMongoCondition() : null,
      engineType: isMongo ? 'docdb' : 'sqldb',
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
