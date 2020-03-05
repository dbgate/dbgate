import { SqlDumper } from '@dbgate/types';
import { Condition, BinaryCondition } from './types';
import { dumpSqlExpression } from './dumpSqlExpression';

export function dumpSqlCondition(dmp: SqlDumper, condition: Condition) {
  switch (condition.conditionType) {
    case 'binary':
      dmp.put('(');
      dumpSqlExpression(dmp, condition.left);
      dmp.put(' %s ', condition.operator);
      dumpSqlExpression(dmp, condition.right);
      dmp.put(')');
      break;
  }
}
