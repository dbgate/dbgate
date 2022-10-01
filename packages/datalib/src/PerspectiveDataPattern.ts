import { PerspectiveDataLoader } from './PerspectiveDataLoader';
import { PerspectiveDataLoadProps } from './PerspectiveDataProvider';
import _isString from 'lodash/isString';
import _isPlainObject from 'lodash/isPlainObject';
import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';

export type PerspectiveDataPatternColumnType = 'null' | 'string' | 'number' | 'boolean' | 'object';

export interface PerspectiveDataPatternColumn {
  name: string;
  types: PerspectiveDataPatternColumnType[];
  columns: PerspectiveDataPatternColumn[];
}

export interface PerspectiveDataPattern {
  conid: string;
  database: string;
  schemaName: string;
  pureName: string;
  columns: PerspectiveDataPatternColumn[];
}

export type PerspectiveDataPatternDict = { [designerId: string]: PerspectiveDataPattern };

function detectValueType(value): PerspectiveDataPatternColumnType {
  if (_isString(value)) return 'string';
  if (_isNumber(value)) return 'number';
  if (_isBoolean(value)) return 'boolean';
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
      const type = detectValueType(row[key]);
      if (!column.types.includes(type)) {
        column.types.push(type);
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
  for (const row of rows) {
    addObjectToColumns(res.columns, row);
  }
  return res;
}
