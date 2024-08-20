import type { SqlDumper } from 'dbgate-types';
import { Condition, BinaryCondition } from './types';
import { dumpSqlExpression } from './dumpSqlExpression';
import { dumpSqlSelect } from './dumpSqlCommand';

export function dumpSqlCondition(dmp: SqlDumper, condition: Condition) {
  switch (condition.conditionType) {
    case 'binary':
      dumpSqlExpression(dmp, condition.left);
      dmp.put(' %s ', condition.operator);
      dumpSqlExpression(dmp, condition.right);
      break;
    case 'isNull':
      dumpSqlExpression(dmp, condition.expr);
      dmp.put(' ^is ^null');
      break;
    case 'isNotNull':
      dumpSqlExpression(dmp, condition.expr);
      dmp.put(' ^is ^not ^null');
      break;
    case 'isEmpty':
      dmp.put('^trim(');
      dumpSqlExpression(dmp, condition.expr);
      dmp.put(") = ''");
      break;
    case 'isNotEmpty':
      dmp.put('^trim(');
      dumpSqlExpression(dmp, condition.expr);
      dmp.put(") <> ''");
      break;
    case 'and':
    case 'or':
      dmp.putCollection(` ^${condition.conditionType} `, condition.conditions, cond => {
        dmp.putRaw('(');
        dumpSqlCondition(dmp, cond);
        dmp.putRaw(')');
      });
      break;
    case 'like':
      dumpSqlExpression(dmp, condition.left);
      dmp.put(dmp.dialect.ilike ? ' ^ilike ' : ' ^like ');
      dumpSqlExpression(dmp, condition.right);
      break;
    case 'notLike':
      dumpSqlExpression(dmp, condition.left);
      dmp.put(' ^not ^like ');
      dumpSqlExpression(dmp, condition.right);
      break;
    case 'not':
      dmp.put('^not (');
      dumpSqlCondition(dmp, condition.condition);
      dmp.put(')');
      break;
    case 'exists':
      dmp.put('^exists (');
      dumpSqlSelect(dmp, condition.subQuery);
      dmp.put(')');
      break;
    case 'notExists':
      dmp.put('^not ^exists (');
      dumpSqlSelect(dmp, condition.subQuery);
      dmp.put(')');
      break;
    case 'between':
      dumpSqlExpression(dmp, condition.expr);
      dmp.put(' ^between ');
      dumpSqlExpression(dmp, condition.left);
      dmp.put(' ^and ');
      dumpSqlExpression(dmp, condition.right);
      break;
    case 'expression':
      dumpSqlExpression(dmp, condition.expr);
      break;
    case 'in':
      dumpSqlExpression(dmp, condition.expr);
      dmp.put(' ^in (%,v)', condition.values);
      break;
    case 'notIn':
      dumpSqlExpression(dmp, condition.expr);
      dmp.put(' ^not ^in (%,v)', condition.values);
      break;
    case 'rawTemplate':
      let was = false;
      for (const item of condition.templateSql.split('$$')) {
        if (was) {
          dumpSqlExpression(dmp, condition.expr);
        }
        dmp.putRaw(item);
        was = true;
      }
      break;
  }
}
