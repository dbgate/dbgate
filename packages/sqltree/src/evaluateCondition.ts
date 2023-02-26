import _cloneDeepWith from 'lodash/cloneDeepWith';
import _escapeRegExp from 'lodash/escapeRegExp';
import { Condition, Expression } from './types';
import { evaluateExpression } from './evaluateExpression';

function isEmpty(value) {
  if (value == null) return true;
  return value.toString().trim() == '';
}

function isLike(value, test) {
  if (!value) return false;
  if (!test) return false;
  const regex = new RegExp(`^${_escapeRegExp(test).replace(/%/g, '.*')}$`, 'i');
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
        case '<>':
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
    case 'anyColumnPass':
      return Object.keys(values).some(columnName => {
        const replaced = _cloneDeepWith(condition.placeholderCondition, (expr: Expression) => {
          if (expr.exprType == 'placeholder')
            return {
              exprType: 'column',
              columnName,
            };
        });
        return evaluateCondition(replaced, values);
      });
  }
}
