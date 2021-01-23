import { SqlDumper } from 'dbgate-types';
import _ from 'lodash';
import { Condition, BinaryCondition } from './types';
import { dumpSqlExpression } from './dumpSqlExpression';
import { link } from 'fs';
import { evaluateExpression } from './evaluateExpression';
import { cond } from 'lodash';

function isEmpty(value) {
  if (value == null) return true;
  return value.toString().trim() == '';
}

function isLike(value, test) {
  if (!value) return false;
  if (!test) return false;
  const regex = new RegExp(`^${_.escapeRegExp(test).replace(/%/g, '.*')}$`, 'i');
  const res = !!value.toString().match(regex);
  return res;
}

export function evaluateCondition(condition: Condition, values) {
  switch (condition.conditionType) {
    case 'binary':
      const left = evaluateExpression(condition.left, values);
      const right = evaluateExpression(condition.right, values);
      switch (condition.operator) {
        case '=':
          return left == right;
        case '!=':
          return left != right;
        case '<=':
          return left <= right;
        case '>=':
          return left >= right;
        case '<':
          return left < right;
        case '>':
          return left > right;
      }
      break;
    case 'isNull':
      return evaluateExpression(condition.expr, values) == null;
    case 'isNotNull':
      return evaluateExpression(condition.expr, values) != null;
    case 'isEmpty':
      return isEmpty(evaluateExpression(condition.expr, values));
    case 'isNotEmpty':
      return !isEmpty(evaluateExpression(condition.expr, values));
    case 'and':
      return condition.conditions.every(cond => evaluateCondition(cond, values));
    case 'or':
      return condition.conditions.some(cond => evaluateCondition(cond, values));
    case 'like':
      return isLike(evaluateExpression(condition.left, values), evaluateExpression(condition.right, values));
      break;
    case 'notLike':
      return !isLike(evaluateExpression(condition.left, values), evaluateExpression(condition.right, values));
    case 'not':
      return !evaluateCondition(condition.condition, values);
  }
}
