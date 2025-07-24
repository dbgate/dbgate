import { FilterBehaviour } from 'dbgate-types';

export const numberFilterBehaviour: FilterBehaviour = {
  supportEquals: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,
  supportSqlCondition: true,

  allowNumberToken: true,
};

export const stringFilterBehaviour: FilterBehaviour = {
  supportEquals: true,
  supportStringInclusion: true,
  supportEmpty: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,
  supportSqlCondition: true,

  allowStringToken: true,
  allowHexString: true,
};

export const logicalFilterBehaviour: FilterBehaviour = {
  supportBooleanValues: true,
  supportNullTesting: true,
  supportBooleanOrNull: true,
  supportSqlCondition: true,
};

export const datetimeFilterBehaviour: FilterBehaviour = {
  supportNullTesting: true,
  supportSqlCondition: true,
  supportDatetimeSymbols: true,
  supportDatetimeComparison: true,
};

export const mongoFilterBehaviour: FilterBehaviour = {
  supportEquals: true,
  supportEmptyArrayTesting: true,
  supportNotEmptyArrayTesting: true,
  supportNumberLikeComparison: true,
  supportStringInclusion: true,
  supportBooleanValues: true,
  supportExistsTesting: true,

  allowStringToken: true,
  allowNumberDualTesting: true,
  allowObjectIdTesting: true,
};

export const evalFilterBehaviour: FilterBehaviour = {
  supportEquals: true,
  supportStringInclusion: true,
  supportEmpty: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,

  allowStringToken: true,
};

export const firestoreFilterBehaviours: FilterBehaviour = {
  supportEquals: true,
  supportEmpty: false,
  supportNumberLikeComparison: true,
  supportDatetimeComparison: false,
  supportNullTesting: true,
  supportBooleanValues: true,
  supportEmptyArrayTesting: true,

  supportStringInclusion: false,
  supportDatetimeSymbols: false,
  supportExistsTesting: false,
  supportSqlCondition: false,

  allowStringToken: true,
  allowNumberToken: true,
  allowHexString: true,
  allowNumberDualTesting: false,
  allowObjectIdTesting: false,

  passBooleans: true,
  passNumbers: true,

  disableOr: true,
};

export const standardFilterBehaviours: { [id: string]: FilterBehaviour } = {
  numberFilterBehaviour,
  stringFilterBehaviour,
  logicalFilterBehaviour,
  datetimeFilterBehaviour,
  mongoFilterBehaviour,
  firestoreFilterBehaviours,
  evalFilterBehaviour,
};
