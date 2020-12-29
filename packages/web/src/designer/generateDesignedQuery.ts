import _ from 'lodash';
import { dumpSqlSelect, Select, JoinType, Condition, Relation, mergeConditions, Source } from 'dbgate-sqltree';
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
  get thisAndSubComponentsTables() {
    return [...this.tables, ..._.flatten(this.subComponents.map((x) => x.thisAndSubComponentsTables))];
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

function findQuerySource(designer: DesignerInfo, designerId: string): Source {
  const table = designer.tables.find((x) => x.designerId == designerId);
  if (!table) return null;
  return {
    name: table,
    alias: table.alias,
  };
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

    const topLevelColumns = this.designer.columns.filter((col) =>
      topLevelTables.find((tbl) => tbl.designerId == col.designerId)
    );
    const outputColumns = topLevelColumns.filter((x) => x.isOutput);
    if (outputColumns.length == 0) {
      res.selectAll = true;
    } else {
      res.columns = outputColumns.map((col) => ({
        exprType: 'column',
        columnName: col.columnName,
        alias: col.alias,
        source: findQuerySource(this.designer, col.designerId),
      }));
    }

    return res;
  }
}

function findPrimaryTable(tables: DesignerTableInfo[]) {
  return _.minBy(tables, (x) => x.top);
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

export default function generateDesignedQuery(designer: DesignerInfo, engine: EngineDriver) {
  const { tables, columns, references } = designer;
  const primaryTable = findPrimaryTable(designer.tables);
  if (!primaryTable) return '';
  const componentCreator = new DesignerComponentCreator(designer);
  const designerDumper = new DesignerQueryDumper(designer, componentCreator.components);
  const select = designerDumper.run();

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
  const creator = new DesignerComponentCreator({
    ...designer,
    references: withoutRef
      ? designer.references.filter((x) => x.designerId != withoutRef.designerId)
      : designer.references,
  });
  const arrays = creator.components.map((x) => x.thisAndSubComponentsTables);
  const array1 = arrays.find((a) => a.find((x) => x.designerId == table1.designerId));
  const array2 = arrays.find((a) => a.find((x) => x.designerId == table2.designerId));
  return array1 == array2;
}
