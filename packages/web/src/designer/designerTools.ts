import _ from 'lodash';
import type { Select, Condition, Source } from 'dbgate-sqltree';
import { dumpSqlSelect, mergeConditions } from 'dbgate-sqltree';
import type { EngineDriver } from 'dbgate-types';
import type { DesignerInfo, DesignerTableInfo, DesignerReferenceInfo, DesignerJoinType } from './types';
import { DesignerComponentCreator } from './DesignerComponentCreator';
import { DesignerQueryDumper } from './DesignerQueryDumper';
import { detectSqlFilterBehaviour } from 'dbgate-tools';

export function referenceIsConnecting(
  reference: DesignerReferenceInfo,
  tables1: DesignerTableInfo[],
  tables2: DesignerTableInfo[]
) {
  return (
    (tables1.find(x => x.designerId == reference.sourceId) && tables2.find(x => x.designerId == reference.targetId)) ||
    (tables1.find(x => x.designerId == reference.targetId) && tables2.find(x => x.designerId == reference.sourceId))
  );
}

export function referenceIsJoin(reference) {
  return ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'].includes(reference.joinType);
}
export function referenceIsExists(reference) {
  return ['WHERE EXISTS', 'WHERE NOT EXISTS'].includes(reference.joinType);
}
export function referenceIsCrossJoin(reference) {
  return !reference.joinType || reference.joinType == 'CROSS JOIN';
}

export function findConnectingReference(
  designer: DesignerInfo,
  tables1: DesignerTableInfo[],
  tables2: DesignerTableInfo[],
  additionalCondition: (ref: DesignerReferenceInfo) => boolean
) {
  for (const ref of designer.references || []) {
    if (additionalCondition(ref) && referenceIsConnecting(ref, tables1, tables2)) {
      return ref;
    }
  }
  return null;
}

export function findQuerySource(designer: DesignerInfo, designerId: string): Source {
  const table = designer.tables.find(x => x.designerId == designerId);
  if (!table) return null;
  return {
    name: table,
    alias: table.alias,
  };
}

export function mergeSelectsFromDesigner(select1: Select, select2: Select): Select {
  return {
    commandType: 'select',
    from: {
      ...select1.from,
      relations: [
        ...select1.from.relations,
        {
          joinType: 'CROSS JOIN',
          name: select2.from.name,
          alias: select2.from.alias,
        },
        ...select2.from.relations,
      ],
    },
    where: mergeConditions(select1.where, select2.where),
  };
}

export function findPrimaryTable(tables: DesignerTableInfo[]) {
  return _.minBy(tables, x => x.top);
}

export function getReferenceConditions(reference: DesignerReferenceInfo, designer: DesignerInfo): Condition[] {
  const sourceTable = designer.tables.find(x => x.designerId == reference.sourceId);
  const targetTable = designer.tables.find(x => x.designerId == reference.targetId);

  return reference.columns.map(col => ({
    conditionType: 'binary',
    operator: '=',
    left: {
      exprType: 'column',
      columnName: col.source,
      source: {
        name: sourceTable,
        alias: sourceTable.alias,
      },
    },
    right: {
      exprType: 'column',
      columnName: col.target,
      source: {
        name: targetTable,
        alias: targetTable.alias,
      },
    },
  }));
}

export function generateDesignedQuery(designer: DesignerInfo, engine: EngineDriver) {
  const { tables, columns, references } = designer;
  const primaryTable = findPrimaryTable(designer.tables);
  if (!primaryTable) return '';
  const componentCreator = new DesignerComponentCreator(designer);
  const designerDumper = new DesignerQueryDumper(designer, componentCreator.components);
  const select = designerDumper.run();
  select.distinct = !!designer?.settings?.isDistinct;

  const dmp = engine.createDumper();
  dumpSqlSelect(dmp, select);
  return dmp.s;
}

export function isConnectedByReference(
  designer: DesignerInfo,
  table1: { designerId: string },
  table2: { designerId: string },
  withoutRef: { designerId: string }
) {
  if (!designer.references) return false;
  const creator = new DesignerComponentCreator({
    ...designer,
    references: withoutRef
      ? designer.references.filter(x => x.designerId != withoutRef.designerId)
      : designer.references,
  });
  const arrays = creator.components.map(x => x.thisAndSubComponentsTables);
  const array1 = arrays.find(a => a.find(x => x.designerId == table1.designerId));
  const array2 = arrays.find(a => a.find(x => x.designerId == table2.designerId));
  return array1 == array2;
}

export function findDesignerFilterBehaviour({ designerId, columnName }, designer) {
  const table = (designer.tables || []).find(x => x.designerId == designerId);
  if (table) {
    const column = (table.columns || []).find(x => x.columnName == columnName);
    if (column) {
      const { dataType } = column;
      return detectSqlFilterBehaviour(dataType);
    }
  }
  return 'string';
}
