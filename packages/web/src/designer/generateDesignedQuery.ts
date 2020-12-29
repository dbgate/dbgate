import _ from 'lodash';
import { dumpSqlSelect, Select, JoinType, Condition, Relation, mergeConditions } from 'dbgate-sqltree';
import { EngineDriver } from 'dbgate-types';
import { DesignerInfo, DesignerTableInfo, DesignerReferenceInfo, DesignerJoinType } from './types';

class DesignerComponent {
  subComponents: DesignerComponent[] = [];
  parentComponent: DesignerComponent;
  parentReference: DesignerReferenceInfo;

  tables: DesignerTableInfo[] = [];
  nonPrimaryReferences: DesignerReferenceInfo[] = [];

  get primaryTable() {
    return this.tables[0];
  }
  get nonPrimaryTables() {
    return this.tables.slice(1);
  }
  get nonPrimaryTablesAndReferences() {
    return _.zip(this.nonPrimaryTables, this.nonPrimaryReferences);
  }
  get myAndParentTables() {
    return [...this.parentTables, ...this.tables];
  }
  get parentTables() {
    return this.parentComponent ? this.parentComponent.myAndParentTables : [];
  }
}

function referenceIsConnecting(
  reference: DesignerReferenceInfo,
  tables1: DesignerTableInfo[],
  tables2: DesignerTableInfo[]
) {
  return (
    (tables1.find((x) => x.designerId == reference.sourceId) &&
      tables2.find((x) => x.designerId == reference.targetId)) ||
    (tables1.find((x) => x.designerId == reference.targetId) && tables2.find((x) => x.designerId == reference.sourceId))
  );
}

function referenceIsJoin(reference) {
  return ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'].includes(reference.joinType);
}
function referenceIsExists(reference) {
  return ['WHERE EXISTS', 'WHERE NOT EXISTS'].includes(reference.joinType);
}
function referenceIsCrossJoin(reference) {
  return !reference.joinType || reference.joinType == 'CROSS JOIN';
}

function findConnectingReference(
  designer: DesignerInfo,
  tables1: DesignerTableInfo[],
  tables2: DesignerTableInfo[],
  additionalCondition: (ref: DesignerReferenceInfo) => boolean
) {
  for (const ref of designer.references) {
    if (additionalCondition(ref) && referenceIsConnecting(ref, tables1, tables2)) {
      return ref;
    }
  }
  return null;
}

class DesignerComponentCreator {
  toAdd: DesignerTableInfo[];
  components: DesignerComponent[] = [];

  constructor(public designer: DesignerInfo) {
    this.toAdd = [...designer.tables];
    while (this.toAdd.length > 0) {
      const component = this.parseComponent(null);
      this.components.push(component);
    }
  }

  parseComponent(root) {
    if (root == null) {
      root = findPrimaryTable(this.toAdd);
    }
    if (!root) return null;
    _.remove(this.toAdd, (x) => x == root);
    const res = new DesignerComponent();
    res.tables.push(root);

    for (;;) {
      let found = false;
      for (const test of this.toAdd) {
        const ref = findConnectingReference(this.designer, res.tables, [test], referenceIsJoin);
        if (ref) {
          res.tables.push(test);
          res.nonPrimaryReferences.push(ref);
          _.remove(this.toAdd, (x) => x == test);
          found = true;
          break;
        }
      }

      if (!found) break;
    }

    for (;;) {
      let found = false;
      for (const test of this.toAdd) {
        const ref = findConnectingReference(this.designer, res.tables, [test], referenceIsExists);
        if (ref) {
          const subComponent = this.parseComponent(test);
          res.subComponents.push(subComponent);
          subComponent.parentComponent = res;
          subComponent.parentReference = ref;
          found = true;
          break;
        }
      }

      if (!found) break;
    }

    return res;
  }
}

function mergeSelects(select1: Select, select2: Select): Select {
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
class DesignerQueryDumper {
  constructor(public designer: DesignerInfo, public components: DesignerComponent[]) {}

  get topLevelTables(): DesignerTableInfo[] {
    return _.flatten(this.components.map((x) => x.tables));
  }

  dumpComponent(component: DesignerComponent) {
    const select: Select = {
      commandType: 'select',
      from: {
        name: component.primaryTable,
        alias: component.primaryTable.alias,
        relations: [],
      },
    };

    for (const [table, ref] of component.nonPrimaryTablesAndReferences) {
      select.from.relations.push({
        name: table,
        alias: table.alias,
        joinType: ref.joinType as JoinType,
        conditions: getReferenceConditions(ref, this.designer),
      });
    }

    for (const subComponent of component.subComponents) {
      const subQuery = this.dumpComponent(subComponent);
      subQuery.selectAll = true;
      select.where = mergeConditions(select.where, {
        conditionType: subComponent.parentReference.joinType == 'WHERE NOT EXISTS' ? 'notExists' : 'exists',
        subQuery,
      });
    }

    if (component.parentReference) {
      select.where = mergeConditions(select.where, {
        conditionType: 'and',
        conditions: getReferenceConditions(component.parentReference, this.designer),
      });

      // cross join conditions in subcomponents
      for (const ref of this.designer.references) {
        if (referenceIsCrossJoin(ref) && referenceIsConnecting(ref, component.tables, component.myAndParentTables)) {
          select.where = mergeConditions(select.where, {
            conditionType: 'and',
            conditions: getReferenceConditions(ref, this.designer),
          });
        }
      }
    }

    return select;
  }

  run() {
    let res: Select = null;
    for (const component of this.components) {
      const select = this.dumpComponent(component);
      if (res == null) res = select;
      else res = mergeSelects(res, select);
    }

    // top level cross join conditions
    const topLevelTables = this.topLevelTables;
    for (const ref of this.designer.references) {
      if (referenceIsCrossJoin(ref) && referenceIsConnecting(ref, topLevelTables, topLevelTables)) {
        res.where = mergeConditions(res.where, {
          conditionType: 'and',
          conditions: getReferenceConditions(ref, this.designer),
        });
      }
    }
    return res;
  }
}

// function groupByComponents(
//   tables: DesignerTableInfo[],
//   references: DesignerReferenceInfo[],
//   joinTypes: string[],
//   primaryTable: DesignerTableInfo
// ) {
//   let components = tables.map((table) => [table]);
//   for (const ref of references) {
//     if (joinTypes.includes(ref.joinType)) {
//       const comp1 = components.find((comp) => comp.find((t) => t.designerId == ref.sourceId));
//       const comp2 = components.find((comp) => comp.find((t) => t.designerId == ref.targetId));
//       if (comp1 && comp2 && comp1 != comp2) {
//         // join components
//         components = [...components.filter((x) => x != comp1 && x != comp2), [...comp1, ...comp2]];
//       }
//     }
//   }
//   if (primaryTable) {
//     const primaryComponent = components.find((comp) => comp.find((t) => t == primaryTable));
//     if (primaryComponent) {
//       components = [primaryComponent, ...components.filter((x) => x != primaryComponent)];
//     }
//   }
//   return components;
// }

function findPrimaryTable(tables: DesignerTableInfo[]) {
  return _.minBy(tables, (x) => x.top);
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

function getReferenceConditions(reference: DesignerReferenceInfo, designer: DesignerInfo): Condition[] {
  const sourceTable = designer.tables.find((x) => x.designerId == reference.sourceId);
  const targetTable = designer.tables.find((x) => x.designerId == reference.targetId);

  return reference.columns.map((col) => ({
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
  const componentCreator = new DesignerComponentCreator(designer);
  const designerDumper = new DesignerQueryDumper(designer, componentCreator.components);
  const select = designerDumper.run();

  //   const components = groupByComponents(
  //     designer.tables,
  //     designer.references,
  //     ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'WHERE EXISTS', 'WHERE NOT EXISTS'],
  //     primaryTable
  //   );

  //   const select: Select = {
  //     commandType: 'select',
  //     from: {
  //       name: primaryTable,
  //       alias: primaryTable.alias,
  //       relations: [],
  //     },
  //   };

  //   const dumpedTables = [primaryTable];
  //   const conditions: Condition[] = [];
  //   for (const component of components) {
  //     const subComponents = groupByComponents(
  //       component,
  //       designer.references,
  //       ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'],
  //       primaryTable
  //     );
  //     for (const subComponent of subComponents) {
  //       const sortedSubComponent = sortTablesByReferences(dumpedTables, subComponent, designer.references);
  //       const table0 = sortedSubComponent[0];
  //       const joinType0 = findJoinType(table0, dumpedTables, designer.references);
  //       if (joinType0 == 'WHERE EXISTS' || joinType0 == 'WHERE NOT EXISTS') {
  //         const subselect: Select = {
  //           commandType: 'select',
  //           from: {
  //             name: table0,
  //             alias: table0.alias,
  //             relations: [],
  //           },
  //         };
  //         dumpedTables.push(table0);
  //         addRelations(subselect.from.relations, sortedSubComponent, dumpedTables, designer);
  //         conditions.push({
  //           conditionType: joinType0 == 'WHERE EXISTS' ? 'exists' : 'notExists',
  //           subQuery: subselect,
  //         });
  //       } else {
  //         addRelations(select.from.relations, sortedSubComponent, dumpedTables, designer);
  //         // for (const table of sortedSubComponent) {

  //         //   if (dumpedTables.includes(table)) continue;
  //         //   select.from.relations.push({
  //         //     name: table,
  //         //     alias: table.alias,
  //         //     joinType: findJoinType(table, dumpedTables, designer.references) as JoinType,
  //         //     conditions: findConditions(table, dumpedTables, designer.references, designer.tables),
  //         //   });
  //         //   dumpedTables.push(table);
  //         // }
  //       }
  //     }
  //   }
  //   if (conditions.length > 0) {
  //     select.where = {
  //       conditionType: 'and',
  //       conditions,
  //     };
  //   }

  const dmp = engine.createDumper();
  dumpSqlSelect(dmp, select);
  return dmp.s;
}
