import { FilterBehaviour } from 'dbgate-types';

export const numberFilterBehaviour: FilterBehaviour = {
  compilerType: 'sqlTree',
  supportEquals: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,
  supportSqlCondition: true,

  allowNumberToken: true,
};

export const stringFilterBehaviour: FilterBehaviour = {
  compilerType: 'sqlTree',
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
  compilerType: 'sqlTree',
  supportBooleanValues: true,
  supportNullTesting: true,
  supportSqlCondition: true,
};

export const datetimeFilterBehaviour: FilterBehaviour = {
  compilerType: 'datetime',
  supportNullTesting: true,
  supportSqlCondition: true,
  supportDatetimeSymbols: true,
  supportDatetimeComparison: true,
};

export const mongoFilterBehaviour: FilterBehaviour = {
  compilerType: 'mongoCondition',
  supportEquals: true,
  supportArrayTesting: true,
  supportNumberLikeComparison: true,
  supportStringInclusion: true,
  supportBooleanValues: true,
  supportExistsTesting: true,
};

export const evalFilterBehaviour: FilterBehaviour = {
  compilerType: 'sqlTree',
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
