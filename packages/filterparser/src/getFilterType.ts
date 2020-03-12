import { DbTypeCode } from '@dbgate/types';
import { FilterType } from './types';

export function getFilterType(typeCode?: DbTypeCode): FilterType {
  if (!typeCode) return 'string';
  switch (typeCode) {
    case 'int':
    case 'numeric':
    case 'float':
      return 'number';
    case 'string':
      return 'string';
    case 'datetime':
      return 'datetime';
    case 'logical':
      return 'logical';
  }
  return 'string';
}
