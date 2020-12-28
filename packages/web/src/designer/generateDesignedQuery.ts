import _ from 'lodash';
import { dumpSqlSelect, Select, JoinType, Condition } from 'dbgate-sqltree';
import { EngineDriver } from 'dbgate-types';
import { DesignerInfo, DesignerTableInfo, DesignerReferenceInfo, DesignerJoinType } from './types';

function groupByComponents(
  tables: DesignerTableInfo[],
  references: DesignerReferenceInfo[],
  joinTypes: string[],
  primaryTable: DesignerTableInfo
) {
  let components = tables.map((table) => [table]);
  for (const ref of references) {
    if (joinTypes.includes(ref.joinType)) {
      const comp1 = components.find((comp) => comp.find((t) => t.designerId == ref.sourceId));
      const comp2 = components.find((comp) => comp.find((t) => t.designerId == ref.targetId));
      if (comp1 && comp2 && comp1 != comp2) {
        // join components
        components = [...components.filter((x) => x != comp1 && x != comp2), [...comp1, ...comp2]];
      }
    }
  }
  if (primaryTable) {
    const primaryComponent = components.find((comp) => comp.find((t) => t == primaryTable));
    if (primaryComponent) {
      components = [primaryComponent, ...components.filter((x) => x != primaryComponent)];
    }
  }
  return components;
}

function findPrimaryTable(tables: DesignerTableInfo[]) {
  return _.minBy(tables, (x) => x.left + x.top);
}

function findJoinType(
  table: DesignerTableInfo,
  dumpedTables: DesignerTableInfo[],
  references: DesignerReferenceInfo[],
  joinTypes: DesignerJoinType[]
): DesignerJoinType {
  const dumpedTableIds = dumpedTables.map((x) => x.designerId);
  const reference = references.find(
    (x) =>
      (x.sourceId == table.designerId && dumpedTableIds.includes(x.targetId)) ||
      (x.targetId == table.designerId && dumpedTableIds.includes(x.sourceId))
  );
  if (reference) return reference.joinType || 'CROSS JOIN';
  return 'CROSS JOIN';
}

function findConditions(
  table: DesignerTableInfo,
  dumpedTables: DesignerTableInfo[],
  references: DesignerReferenceInfo[],
  tables: DesignerTableInfo[]
): Condition[] {
  const dumpedTableIds = dumpedTables.map((x) => x.designerId);
  const res = [];
  for (const reference of references.filter(
    (x) =>
      (x.sourceId == table.designerId && dumpedTableIds.includes(x.targetId)) ||
      (x.targetId == table.designerId && dumpedTableIds.includes(x.sourceId))
  )) {
    const sourceTable = tables.find((x) => x.designerId == reference.sourceId);
    const targetTable = tables.find((x) => x.designerId == reference.targetId);
    res.push(
      ...reference.columns.map((col) => ({
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
      }))
    );
  }
  return res;
}

export default function generateDesignedQuery(designer: DesignerInfo, engine: EngineDriver) {
  const { tables, columns, references } = designer;
  const primaryTable = findPrimaryTable(designer.tables);
  if (!primaryTable) return '';
  const components = groupByComponents(
    designer.tables,
    designer.references,
    ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'WHERE EXISTS', 'WHERE NOT EXISTS'],
    primaryTable
  );

  const select: Select = {
    commandType: 'select',
    from: {
      name: primaryTable,
      alias: primaryTable.alias,
      relations: [],
    },
  };

  const dumpedTables = [primaryTable];
  for (const component of components) {
    const subComponents = groupByComponents(
      component,
      designer.references,
      ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'],
      primaryTable
    );
    for (const subComponent of subComponents) {
      for (const table of subComponent) {
        if (dumpedTables.includes(table)) continue;
        select.from.relations.push({
          name: table,
          alias: table.alias,
          joinType: findJoinType(table, dumpedTables, designer.references, [
            'INNER JOIN',
            'LEFT JOIN',
            'RIGHT JOIN',
            'FULL OUTER JOIN',
          ]) as JoinType,
          conditions: findConditions(table, dumpedTables, designer.references, designer.tables),
        });
        dumpedTables.push(table);
      }
    }
  }

  const dmp = engine.createDumper();
  dumpSqlSelect(dmp, select);
  return dmp.s;
}
