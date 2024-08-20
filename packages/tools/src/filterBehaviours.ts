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
  supportArrayTesting: true,
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

export const standardFilterBehaviours: { [id: string]: FilterBehaviour } = {
  numberFilterBehaviour,
  stringFilterBehaviour,
  logicalFilterBehaviour,
  datetimeFilterBehaviour,
  mongoFilterBehaviour,
  evalFilterBehaviour,
};
