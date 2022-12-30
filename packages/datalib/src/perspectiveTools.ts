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
import { PerspectiveTreeNode } from './PerspectiveTreeNode';
import { PerspectivePatternColumnNode } from './PerspectivePatternColumnNode';
import { PerspectiveTableColumnNode } from './PerspectiveTableColumnNode';
import { PerspectiveTableReferenceNode } from './PerspectiveTableReferenceNode';
import { PerspectiveCustomJoinTreeNode } from './PerspectiveCustomJoinTreeNode';

export function getPerspectiveParentColumnName(columnName: string) {
  const path = columnName.split('::');
  if (path.length >= 2) return path.slice(0, -1).join('::');
  return null;
}

export function getPerspectiveMostNestedChildColumnName(columnName: string) {
  const path = columnName.split('::');
  return path[path.length - 1];
}

// export function perspectiveValueMatcher(value1, value2): boolean {
//   if (value1?.$oid && value2?.$oid) return value1.$oid == value2.$oid;
//   if (Array.isArray(value1)) return !!value1.find(x => perspectiveValueMatcher(x, value2));
//   if (Array.isArray(value2)) return !!value2.find(x => perspectiveValueMatcher(value1, x));
//   return value1 == value2;
// }

export function perspectiveValueMatcher(value1, value2): boolean {
  if (value1?.$oid && value2?.$oid) return value1.$oid == value2.$oid;
  return value1 == value2;
}

export function findDesignerIdForNode<T extends PerspectiveTreeNode>(
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
  databaseConfig: PerspectiveDatabaseConfig,
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
              databaseConfig,
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
              databaseConfig,
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
            databaseConfig,
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
                databaseConfig,
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
        const newConfig = { ...databaseConfig };
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
              newConfig,
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
