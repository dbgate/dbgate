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
import { PerspectiveTreeNode } from './PerspectiveTreeNode';
import { PerspectiveCustomJoinTreeNode } from './PerspectiveCustomJoinTreeNode';

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
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(dbs, config, setConfig, parentNode, dataProvider, databaseConfig, designerId);
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

  get filterType(): FilterType {
    if (this.tableColumn) return getFilterType(this.tableColumn.dataType);
    return 'mongo';
  }

  get preloadedLevelData() {
    return true;
  }

  isPatternTreeNode() {
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
          this.databaseConfig,
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

          const newConfig = { ...this.databaseConfig };
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
                newConfig,
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
      filterType: this.filterType,
      pureName: this.table.pureName,
      schemaName: this.table.schemaName,
      foreignKey: this.foreignKey,
    };
  }

  parseFilterCondition(source = null): {} {
    const filter = this.getFilter();
    if (!filter) return null;
    const condition = parseFilter(filter, 'mongo');
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
