import { ResultField } from './types';

export function createColumnResultField(columnName: string): ResultField {
  return {
    expr: {
      exprType: 'column',
      columnName,
    },
  };
}
