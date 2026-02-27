import type { SqlDumper } from 'dbgate-types';
import { Condition, BinaryCondition, LikeCondition } from './types';
import { dumpSqlExpression } from './dumpSqlExpression';
import { dumpSqlSelect } from './dumpSqlCommand';


function dumpLikeAsFunctionCondition(dmp: SqlDumper, condition: LikeCondition) {
  // For DynamoDB: contains() works only on string attributes
  // For numeric values, search both as number and as string
  const likeExpr = condition.right;
  
  let isNumericValue = false;
  let numericStringValue = '';
  if (likeExpr.exprType === 'value' && typeof likeExpr.value === 'string') {
    const cleanedStr = (likeExpr.value || '').replace(/%/g, '').trim();
    // Only match valid decimal numbers (not Infinity, NaN, etc.)
    isNumericValue = /^-?\d+(\.\d+)?$/.test(cleanedStr);
    numericStringValue = cleanedStr;
  } else if (likeExpr.exprType === 'value' && typeof likeExpr.value === 'number') {
    isNumericValue = Number.isFinite(likeExpr.value);
    numericStringValue = String(likeExpr.value);
  }
  
  if (isNumericValue) {
    // For numeric values: (column = value OR contains(column, 'value'))
    dmp.putRaw('(');
    dumpSqlExpression(dmp, condition.left);
    dmp.putRaw(' = ');
    dmp.put('%s', numericStringValue);
    dmp.putRaw(' OR contains(');
    dumpSqlExpression(dmp, condition.left);
    dmp.putRaw(', ');
    dmp.put('%v', numericStringValue);
    dmp.putRaw('))');
  } else {
    // String value: contains(column, value)
    dmp.putRaw('contains(');
    dumpSqlExpression(dmp, condition.left);
    dmp.putRaw(', ');
    if (likeExpr.exprType === 'value') {
      let cleanValue = likeExpr.value;
      if (typeof cleanValue === 'string') {
        cleanValue = cleanValue.replace(/%/g, '');
      }
      dmp.put('%v', cleanValue);
    } else {
      dumpSqlExpression(dmp, likeExpr);
    }
    dmp.putRaw(')');
  }
}

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
      // Use DATALENGTH for MSSQL TEXT/NTEXT/IMAGE columns to avoid TRIM error
      if (dmp.dialect.useDatalengthForEmptyString?.(condition.expr?.['dataType'])) {
        dmp.put('^datalength(');
        dumpSqlExpression(dmp, condition.expr);
        dmp.put(') = 0');
      } else {
        dmp.put('^trim(');
        dumpSqlExpression(dmp, condition.expr);
        dmp.put(") = ''");
      }
      break;
    case 'isNotEmpty':
      // Use DATALENGTH for MSSQL TEXT/NTEXT/IMAGE columns to avoid TRIM error
      if (dmp.dialect.useDatalengthForEmptyString?.(condition.expr?.['dataType'])) {
        dmp.put('^datalength(');
        dumpSqlExpression(dmp, condition.expr);
        dmp.put(') > 0');
      } else {
        dmp.put('^trim(');
        dumpSqlExpression(dmp, condition.expr);
        dmp.put(") <> ''");
      }
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
      if (dmp.dialect.likeAsFunction) {
        dumpLikeAsFunctionCondition(dmp, condition);
      } else {
        dumpSqlExpression(dmp, condition.left);
        dmp.put(dmp.dialect.ilike ? ' ^ilike ' : ' ^like ');
        dumpSqlExpression(dmp, condition.right);
      }
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
