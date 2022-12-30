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

export class PerspectiveCustomJoinTreeNode extends PerspectiveTableNode {
  constructor(
    public customJoin: PerspectiveCustomJoinConfig,
    table: TableInfo | ViewInfo | CollectionInfo,
    dbs: MultipleDatabaseInfo,
    config: PerspectiveConfig,
    setConfig: ChangePerspectiveConfigFunc,
    public dataProvider: PerspectiveDataProvider,
    databaseConfig: PerspectiveDatabaseConfig,
    parentNode: PerspectiveTreeNode,
    designerId: string
  ) {
    super(table, dbs, config, setConfig, dataProvider, databaseConfig, parentNode, designerId);
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
    const isMongo = isCollectionInfo(this.table);

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
      allColumns: isMongo,
      databaseConfig: this.databaseConfig,
      orderBy: this.getOrderBy(this.table),
      sqlCondition: isMongo ? null : this.getChildrenSqlCondition(),
      mongoCondition: isMongo ? this.getChildrenMongoCondition() : null,
      engineType: isMongo ? 'docdb' : 'sqldb',
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

