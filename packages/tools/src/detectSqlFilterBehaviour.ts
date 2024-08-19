import { FilterBehaviour } from 'dbgate-types';
import {
  datetimeFilterBehaviour,
  logicalFilterBehaviour,
  numberFilterBehaviour,
  stringFilterBehaviour,
} from './filterBehaviours';
import { isTypeDateTime, isTypeLogical, isTypeNumber, isTypeString } from './commonTypeParser';

export function detectSqlFilterBehaviour(dataType: string): FilterBehaviour {
  if (!dataType) return stringFilterBehaviour;
  if (isTypeNumber(dataType)) return numberFilterBehaviour;
  if (isTypeString(dataType)) return stringFilterBehaviour;
  if (isTypeLogical(dataType)) return logicalFilterBehaviour;
  if (isTypeDateTime(dataType)) return datetimeFilterBehaviour;
  return stringFilterBehaviour;
}
