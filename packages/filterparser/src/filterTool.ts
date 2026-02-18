import { arrayToHexString, base64ToHex, evalFilterBehaviour, isTypeDateTime } from 'dbgate-tools';
import { format, toDate } from 'date-fns';
import _isString from 'lodash/isString';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import { Condition, Expression } from 'dbgate-sqltree';
import { parseFilter } from './parseFilter';

export type FilterMultipleValuesMode = 'is' | 'is_not' | 'contains' | 'begins' | 'ends';

function getDateStringWithoutTimeZone(dateString) {
  if (_isString(dateString)) {
    return dateString.replace(/Z|([+-]\d{2}:\d{2})$/, '');
  }
  return dateString;
}

export function getFilterValueExpression(value, dataType?) {
  if (value == null) return 'NULL';
  if (isTypeDateTime(dataType)) {
    // Check for year as number (GROUP:YEAR)
    if (typeof value === 'number' && Number.isInteger(value) && value >= 1000 && value <= 9999) {
      return value.toString();
    }
    
    if (_isString(value)) {
      // Year only
      if (/^\d{4}$/.test(value)) {
        return value;
      }
      
      // Year-month: validate month is in range 01-12
      const yearMonthMatch = value.match(/^(\d{4})-(\d{1,2})$/);
      if (yearMonthMatch) {
        const month = parseInt(yearMonthMatch[2], 10);
        if (month >= 1 && month <= 12) {
          return value;
        }
      }
      
      // Year-month-day: validate month and day
      const yearMonthDayMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (yearMonthDayMatch) {
        const month = parseInt(yearMonthDayMatch[2], 10);
        const day = parseInt(yearMonthDayMatch[3], 10);
        
        // Quick validation: month 1-12, day 1-31
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          // Construct a date to verify it's actually valid (e.g., reject 2024-02-30)
          const dateStr = `${yearMonthDayMatch[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const date = toDate(dateStr);
          if (!isNaN(date.getTime())) {
            return value;
          }
        }
      }
    }
    return format(toDate(getDateStringWithoutTimeZone(value)), 'yyyy-MM-dd HH:mm:ss');
  }
  if (value === true) return 'TRUE';
  if (value === false) return 'FALSE';
  if (value.$oid) return `ObjectId("${value.$oid}")`;
  if (value.$bigint) return value.$bigint;
  if (value.$decimal) return value.$decimal;
  if (value.type == 'Buffer' && Array.isArray(value.data)) {
    return '0x' + arrayToHexString(value.data);
  }
  if (value?.$binary?.base64) {
    return base64ToHex(value.$binary.base64);
  }
  return `="${value}"`;
}

export function createMultiLineFilter(mode: FilterMultipleValuesMode, text: string) {
  let res = '';
  for (let line of text.split('\n')) {
    line = line.trim();
    if (line.length == 0) continue;

    if (res.length > 0) {
      switch (mode) {
        case 'is_not':
          res += ' ';
          break;
        default:
          res += ',';
          break;
      }
    }

    switch (mode) {
      case 'is':
        res += "='" + line + "'";
        break;
      case 'is_not':
        res += "<>'" + line + "'";
        break;
      case 'contains':
        res += "'" + line + "'";
        break;
      case 'begins':
        res += "^'" + line + "'";
        break;
      case 'ends':
        res += "$'" + line + "'";
        break;
    }
  }
  return res;
}

export function compileCompoudEvalCondition(filters: { [column: string]: string }): Condition {
  if (!filters) return null;
  const conditions = [];
  for (const name in filters) {
    try {
      const condition = parseFilter(filters[name], evalFilterBehaviour);
      const replaced = _cloneDeepWith(condition, (expr: Expression) => {
        if (expr.exprType == 'placeholder')
          return {
            exprType: 'column',
            columnName: name,
          };
      });
      conditions.push(replaced);
    } catch (err) {
      // filter parse error - ignore filter
    }
  }

  if (conditions.length == 0) return null;
  return {
    conditionType: 'and',
    conditions,
  };
}
