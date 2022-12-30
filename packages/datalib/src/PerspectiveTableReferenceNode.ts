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
import { PerspectiveTableNode } from './PerspectiveTableNode';
import { PerspectiveTreeNode } from './PerspectiveTreeNode';

export class PerspectiveTableReferenceNode extends PerspectiveTableNode {
  constructor(
    public foreignKey: ForeignKeyInfo,
    table: TableInfo,
    dbs: MultipleDatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    databaseConfig: PerspectiveDatabaseConfig,
    public isMultiple: boolean,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(table, dbs, config, setConfig, dataProvider, databaseConfig, parentNode, designerId);
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
