import { arrayToHexString, isTypeDateTime } from 'dbgate-tools';
import { format, toDate } from 'date-fns';
import _isString from 'lodash/isString';

export type FilterMultipleValuesMode = 'is' | 'is_not' | 'contains' | 'begins' | 'ends';

function getDateStringWithoutTimeZone(dateString) {
  if (_isString(dateString)) {
    return dateString.replace(/Z|([+-]\d{2}:\d{2})$/, '');
  }
  return dateString;
}

export function getFilterValueExpression(value, dataType?) {
  if (value == null) return 'NULL';
  if (isTypeDateTime(dataType)) return format(toDate(getDateStringWithoutTimeZone(value)), 'yyyy-MM-dd HH:mm:ss');
  if (value === true) return 'TRUE';
  if (value === false) return 'FALSE';
  if (value.$oid) return `ObjectId("${value.$oid}")`;
  if (value.type == 'Buffer' && Array.isArray(value.data)) {
    return '0x' + arrayToHexString(value.data);
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
