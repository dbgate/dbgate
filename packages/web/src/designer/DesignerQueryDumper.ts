import _ from 'lodash';
import type { Select, JoinType, Condition, ResultField, Expression } from 'dbgate-sqltree';

import { mergeConditions } from 'dbgate-sqltree';
import type { DesignerInfo, DesignerTableInfo } from './types';
import type { DesignerComponent } from './DesignerComponentCreator';
import {
  getReferenceConditions,
  referenceIsCrossJoin,
  referenceIsConnecting,
  mergeSelectsFromDesigner,
  findQuerySource,
  findDesignerFilterBehaviour,
} from './designerTools';
import { parseFilter } from 'dbgate-filterparser';

export class DesignerQueryDumper {
  constructor(public designer: DesignerInfo, public components: DesignerComponent[]) {}

  get topLevelTables(): DesignerTableInfo[] {
    return _.flatten(this.components.map(x => x.tables));
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
      for (const ref of this.designer.references || []) {
        if (referenceIsCrossJoin(ref) && referenceIsConnecting(ref, component.tables, component.myAndParentTables)) {
          select.where = mergeConditions(select.where, {
            conditionType: 'and',
            conditions: getReferenceConditions(ref, this.designer),
          });
        }
      }
      this.addConditions(select, component.tables);
    }

    return select;
  }

  buildConditionFromFilterField(tables: DesignerTableInfo[], filterField: string, getExpression?: Function): Condition {
    const conditions = [];

    for (const column of this.designer.columns || []) {
      if (!column[filterField]) continue;

      if (!column.isCustomExpression) {
        const table = (this.designer.tables || []).find(x => x.designerId == column.designerId);
        if (!table) continue;
        if (!tables.find(x => x.designerId == table.designerId)) continue;
      }

      try {
        const condition = parseFilter(column[filterField], findDesignerFilterBehaviour(column, this.designer));
        if (condition) {
          conditions.push(
            _.cloneDeepWith(condition, expr => {
              if (expr.exprType == 'placeholder') {
                if (getExpression) return getExpression(column);
                return this.getColumnExpression(column);
              }
            })
          );
        }
      } catch (err) {
        // condition is skipped
        continue;
      }
    }

    if (conditions.length == 0) {
      return null;
    }

    if (conditions.length == 1) {
      return conditions[0];
    }

    return {
      conditionType: 'and',
      conditions,
    };
  }

  addConditionsCore(select: Select, tables: DesignerTableInfo[], filterFields, selectField, getExpression?) {
    const conditions: Condition[] = _.compact(
      filterFields.map(field => this.buildConditionFromFilterField(tables, field, getExpression))
    );

    if (conditions.length == 0) {
      return;
    }
    if (conditions.length == 0) {
      select[selectField] = mergeConditions(select[selectField], conditions[0]);
      return;
    }
    select[selectField] = mergeConditions(select[selectField], {
      conditionType: 'or',
      conditions,
    });
  }

  addConditions(select: Select, tables: DesignerTableInfo[]) {
    const additionalFilterCount = this.designer.settings?.additionalFilterCount || 0;
    const filterFields = ['filter', ..._.range(additionalFilterCount).map(index => `additionalFilter${index + 1}`)];
    this.addConditionsCore(select, tables, filterFields, 'where');
  }

  addGroupConditions(select: Select, tables: DesignerTableInfo[], selectIsGrouped: boolean) {
    const additionalGroupFilterCount = this.designer.settings?.additionalGroupFilterCount || 0;
    const filterFields = [
      'groupFilter',
      ..._.range(additionalGroupFilterCount).map(index => `additionalGroupFilter${index + 1}`),
    ];
    this.addConditionsCore(select, tables, filterFields, 'having', column =>
      this.getColumnResultField(column, selectIsGrouped)
    );
  }

  getColumnExpression(col): Expression {
    const source = findQuerySource(this.designer, col.designerId);
    const { columnName, isCustomExpression, customExpression } = col;

    const res: Expression = isCustomExpression
      ? {
          exprType: 'raw',
          sql: customExpression,
        }
      : {
          exprType: 'column',
          columnName,
          source,
        };
    return res;
  }

  getColumnResultField(col, selectIsGrouped): ResultField {
    const { columnName } = col;
    let { alias } = col;

    const exprCore = this.getColumnExpression(col);

    if (selectIsGrouped && !col.isGrouped) {
      // use aggregate
      const aggregate = col.aggregate == null || col.aggregate == '---' ? 'MAX' : col.aggregate;
      if (!alias) alias = `${aggregate}(${columnName})`;

      return {
        exprType: 'call',
        func: aggregate == 'COUNT DISTINCT' ? 'COUNT' : aggregate,
        argsPrefix: aggregate == 'COUNT DISTINCT' ? 'DISTINCT' : null,
        alias,
        args: [exprCore],
      };
    } else {
      return {
        ...exprCore,
        alias,
      };
    }
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
    for (const ref of this.designer.references || []) {
      if (referenceIsCrossJoin(ref) && referenceIsConnecting(ref, topLevelTables, topLevelTables)) {
        res.where = mergeConditions(res.where, {
          conditionType: 'and',
          conditions: getReferenceConditions(ref, this.designer),
        });
      }
    }

    const topLevelColumns = (this.designer.columns || []).filter(
      col =>
        topLevelTables.find(tbl => tbl.designerId == col.designerId) || (col.isCustomExpression && col.customExpression)
    );
    const selectIsGrouped = !!topLevelColumns.find(x => x.isGrouped || (x.aggregate && x.aggregate != '---'));
    const outputColumns = topLevelColumns.filter(x => x.isOutput);
    if (outputColumns.length == 0) {
      res.selectAll = true;
    } else {
      res.columns = outputColumns.map(col => this.getColumnResultField(col, selectIsGrouped));
    }

    const groupedColumns = topLevelColumns.filter(x => x.isGrouped);
    if (groupedColumns.length > 0) {
      res.groupBy = groupedColumns.map(col => this.getColumnExpression(col));
    }

    const orderColumns = _.sortBy(
      topLevelColumns.filter(x => x.sortOrder),
      x => Math.abs(x.sortOrder)
    );
    if (orderColumns.length > 0) {
      res.orderBy = orderColumns.map(col => ({
        ...this.getColumnExpression(col),
        direction: col.sortOrder < 0 ? 'DESC' : 'ASC',
      }));
    }

    this.addConditions(res, topLevelTables);
    this.addGroupConditions(res, topLevelTables, selectIsGrouped);

    return res;
  }
}
