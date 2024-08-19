import { isTypeNumber, isTypeString, isTypeLogical, isTypeDateTime } from 'dbgate-tools';
import { FilterBehaviour } from 'dbgate-types';
import { DatetimeFilterBehaviour, LogicalFilterBehaviour, NumberFilterBehaviour, StringFilterBehaviour } from './filterTypes';

export function detectSqlFilterType(dataType: string): FilterBehaviour {
  if (!dataType) return StringFilterBehaviour;
  if (isTypeNumber(dataType)) return NumberFilterBehaviour;
  if (isTypeString(dataType)) return StringFilterBehaviour;
  if (isTypeLogical(dataType)) return LogicalFilterBehaviour;
  if (isTypeDateTime(dataType)) return DatetimeFilterBehaviour;
  return StringFilterBehaviour;
}
