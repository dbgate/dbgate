import { SqlDumper } from '@dbgate/types';
import { Expression, ColumnRefExpression } from './types';
import { dumpSqlSourceRef } from './dumpSqlSource';

export function dumpSqlExpression(dmp: SqlDumper, expr: Expression) {
  switch (expr.exprType) {
    case 'column':
      {
        if (expr.source) {
          if (dumpSqlSourceRef(dmp, expr.source)) {
            dmp.put('.');
          }
        }
        dmp.put('%i', expr.columnName);
      }
      break;
  }
}
