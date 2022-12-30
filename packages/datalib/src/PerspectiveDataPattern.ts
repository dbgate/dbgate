import { PerspectiveDataLoader } from './PerspectiveDataLoader';
import { PerspectiveDataLoadProps } from './PerspectiveDataProvider';
import _isString from 'lodash/isString';
import _isPlainObject from 'lodash/isPlainObject';
import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';
import _isArray from 'lodash/isArray';
import { safeJsonParse } from 'dbgate-tools';

export type PerspectiveDataPatternColumnType = 'null' | 'oid' | 'string' | 'number' | 'boolean' | 'json';

export interface PerspectiveDataPatternColumn {
  name: string;
  types: PerspectiveDataPatternColumnType[];
  columns: PerspectiveDataPatternColumn[];
}

export interface PerspectiveDataPattern {
  conid: string;
  database: string;
  schemaName?: string;
  pureName: string;
  columns: PerspectiveDataPatternColumn[];
}

export type PerspectiveDataPatternDict = { [designerId: string]: PerspectiveDataPattern };

function detectValueType(value): PerspectiveDataPatternColumnType {
  if (_isString(value)) return 'string';
  if (_isNumber(value)) return 'number';
  if (_isBoolean(value)) return 'boolean';
  if (value?.$oid) return 'oid';
  if (_isPlainObject(value) || _isArray(value)) return 'json';
  if (value == null) return 'null';
}

function addObjectToColumns(columns: PerspectiveDataPatternColumn[], row) {
  if (_isPlainObject(row)) {
    for (const key of Object.keys(row)) {
      let column: PerspectiveDataPatternColumn = columns.find(x => x.name == key);
      if (!column) {
        column = {
          name: key,
          types: [],
          columns: [],
        };
        columns.push(column);
      }
      const value = row[key];
      const type = detectValueType(value);
      if (!column.types.includes(type)) {
        column.types.push(type);
      }
      if (_isPlainObject(value) && type != 'oid') {
        addObjectToColumns(column.columns, value);
      }
      if (_isArray(value)) {
        for (const item of value) {
          addObjectToColumns(column.columns, item);
        }
      }
      if (_isString(value)) {
        const json = safeJsonParse(value);
        if (json && (_isPlainObject(json) || _isArray(json))) {
          if (!column.types.includes('json')) {
            column.types.push('json');
          }
          if (_isPlainObject(json)) {
            addObjectToColumns(column.columns, json);
          }
          if (_isArray(json)) {
            for (const item of json) {
              addObjectToColumns(column.columns, item);
            }
          }
        }
      }
    }
  }
}

export function analyseDataPattern(
  patternBase: Omit<PerspectiveDataPattern, 'columns'>,
  rows: any[]
): PerspectiveDataPattern {
  const res: PerspectiveDataPattern = {
    ...patternBase,
    columns: [],
  };
  // console.log('ROWS', rows);
  for (const row of rows) {
    addObjectToColumns(res.columns, row);
  }
  return res;
}
