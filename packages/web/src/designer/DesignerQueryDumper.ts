import _ from 'lodash';
import { dumpSqlSelect, Select, JoinType, Condition, Relation, mergeConditions, Source } from 'dbgate-sqltree';
import { EngineDriver } from 'dbgate-types';
import { DesignerInfo, DesignerTableInfo, DesignerReferenceInfo, DesignerJoinType } from './types';
import { DesignerComponent } from './DesignerComponentCreator';
import {
  getReferenceConditions,
  referenceIsCrossJoin,
  referenceIsConnecting,
  mergeSelectsFromDesigner,
  findQuerySource,
} from './designerTools';

export class DesignerQueryDumper {
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
      else res = mergeSelectsFromDesigner(res, select);
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
