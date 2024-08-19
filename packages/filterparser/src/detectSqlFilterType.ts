import { isTypeNumber, isTypeString, isTypeLogical, isTypeDateTime } from 'dbgate-tools';
import { StructuredFilterType } from 'dbgate-types';
import { DatetimeFilterType, LogicalFilterType, NumberFilterType, StringFilterType } from './filterTypes';

export function detectSqlFilterType(dataType: string): StructuredFilterType {
  if (!dataType) return StringFilterType;
  if (isTypeNumber(dataType)) return NumberFilterType;
  if (isTypeString(dataType)) return StringFilterType;
  if (isTypeLogical(dataType)) return LogicalFilterType;
  if (isTypeDateTime(dataType)) return DatetimeFilterType;
  return StringFilterType;
}
