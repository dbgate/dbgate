import _get from 'lodash/get';
import { SqlDumper } from 'dbgate-types';
import { Expression, ColumnRefExpression } from './types';
import { dumpSqlSourceRef } from './dumpSqlSource';

export function evaluateExpression(expr: Expression, values) {
  switch (expr.exprType) {
    case 'column':
      return _get(values, expr.columnName);

    case 'placeholder':
      return values.__placeholder;

    case 'value':
      return expr.value;

    case 'raw':
      return expr.sql;

    case 'call':
      return null;

    case 'methodCall':
      return null;

    case 'transform':
      return null;
  }
}
