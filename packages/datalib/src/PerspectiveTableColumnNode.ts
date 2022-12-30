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
  getTableChildPerspectiveNodes,
  perspectiveValueMatcher,
} from './perspectiveTools';
import { PerspectiveTreeNode } from './PerspectiveTreeNode';

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
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(dbs, config, setConfig, parentNode, dataProvider, databaseConfig, designerId);

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

  get filterType(): FilterType {
    return getFilterType(this.column.dataType);
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

  parseFilterCondition(source = null): Condition {
    const filter = this.getFilter();
    if (!filter) return null;
    const condition = parseFilter(filter, this.filterType);
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
