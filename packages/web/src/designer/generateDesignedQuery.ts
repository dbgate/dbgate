import _ from 'lodash';
import { dumpSqlSelect, Select, JoinType, Condition, Relation } from 'dbgate-sqltree';
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
  joinTypes = ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'WHERE EXISTS', 'WHERE NOT EXISTS']
): DesignerJoinType {
  const dumpedTableIds = dumpedTables.map((x) => x.designerId);
  const reference = references.find(
    (x) =>
      joinTypes.includes(x.joinType) &&
      ((x.sourceId == table.designerId && dumpedTableIds.includes(x.targetId)) ||
        (x.targetId == table.designerId && dumpedTableIds.includes(x.sourceId)))
  );
  if (reference) return reference.joinType || 'CROSS JOIN';
  return 'CROSS JOIN';
}

function sortTablesByReferences(
  dumpedTables: DesignerTableInfo[],
  tables: DesignerTableInfo[],
  references: DesignerReferenceInfo[],
  joinTypes = ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'WHERE EXISTS', 'WHERE NOT EXISTS']
) {
  const res = [];
  const dumpedTableIds = dumpedTables.map((x) => x.designerId);
  const toAdd = [...tables];
  while (toAdd.length > 0) {
    let found = false;
    for (const test of toAdd) {
      const reference = references.find(
        (x) =>
          joinTypes.includes(x.joinType) &&
          ((x.sourceId == test.designerId && dumpedTableIds.includes(x.targetId)) ||
            (x.targetId == test.designerId && dumpedTableIds.includes(x.sourceId)))
      );
      if (reference) {
        res.push(test);
        _.remove(toAdd, (x) => x == test);
        dumpedTableIds.push(test.designerId);
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  res.push(...toAdd);
  return res;
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

function addRelations(
  relations: Relation[],
  tables: DesignerTableInfo[],
  dumpedTables: DesignerTableInfo[],
  designer: DesignerInfo
) {
  for (const table of tables) {
    if (dumpedTables.includes(table)) continue;
    relations.push({
      name: table,
      alias: table.alias,
      joinType: findJoinType(table, dumpedTables, designer.references) as JoinType,
      conditions: findConditions(table, dumpedTables, designer.references, designer.tables),
    });
    dumpedTables.push(table);
  }
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
  const conditions: Condition[] = [];
  for (const component of components) {
    const subComponents = groupByComponents(
      component,
      designer.references,
      ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'],
      primaryTable
    );
    for (const subComponent of subComponents) {
      const sortedSubComponent = sortTablesByReferences(dumpedTables, subComponent, designer.references);
      const table0 = sortedSubComponent[0];
      const joinType0 = findJoinType(table0, dumpedTables, designer.references);
      if (joinType0 == 'WHERE EXISTS' || joinType0 == 'WHERE NOT EXISTS') {
        const subselect: Select = {
          commandType: 'select',
          from: {
            name: table0,
            alias: table0.alias,
            relations: [],
          },
        };
        dumpedTables.push(table0);
        addRelations(subselect.from.relations, sortedSubComponent, dumpedTables, designer);
        conditions.push({
          conditionType: joinType0 == 'WHERE EXISTS' ? 'exists' : 'notExists',
          subQuery: subselect,
        });
      } else {
        addRelations(select.from.relations, sortedSubComponent, dumpedTables, designer);
        // for (const table of sortedSubComponent) {

        //   if (dumpedTables.includes(table)) continue;
        //   select.from.relations.push({
        //     name: table,
        //     alias: table.alias,
        //     joinType: findJoinType(table, dumpedTables, designer.references) as JoinType,
        //     conditions: findConditions(table, dumpedTables, designer.references, designer.tables),
        //   });
        //   dumpedTables.push(table);
        // }
      }
    }
  }
  if (conditions.length > 0) {
    select.where = {
      conditionType: 'and',
      conditions,
    };
  }

  const dmp = engine.createDumper();
  dumpSqlSelect(dmp, select);
  return dmp.s;
}
