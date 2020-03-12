import { SqlDumper } from '@dbgate/types';
import { Condition, BinaryCondition } from './types';
import { dumpSqlExpression } from './dumpSqlExpression';

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
  }
}
