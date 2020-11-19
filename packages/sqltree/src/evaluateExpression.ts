import _ from 'lodash';
import { SqlDumper } from 'dbgate-types';
import { Expression, ColumnRefExpression } from './types';
import { dumpSqlSourceRef } from './dumpSqlSource';

export function evaluateExpression(expr: Expression, values) {
  switch (expr.exprType) {
    case 'column':
      return values[expr.columnName];

    case 'placeholder':
      return values.__placeholder;

    case 'value':
      return expr.value;

    case 'raw':
      return expr.sql;

    case 'call':
      return null;

    case 'transform':
      return null;
  }
}
