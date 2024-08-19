import { FilterBehaviour } from 'dbgate-types';

export const NumberFilterBehaviour: FilterBehaviour = {
  compilerType: 'sqlTree',
  supportEquals: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,
  supportSqlCondition: true,

  allowNumberToken: true,
};

export const StringFilterBehaviour: FilterBehaviour = {
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

export const LogicalFilterBehaviour: FilterBehaviour = {
  compilerType: 'sqlTree',
  supportBooleanValues: true,
  supportNullTesting: true,
  supportSqlCondition: true,
};

export const DatetimeFilterBehaviour: FilterBehaviour = {
  compilerType: 'sqlTree',
  supportNullTesting: true,
  supportSqlCondition: true,
  supportDatetimeSymbols: true,
  supportDatetimeComparison: true,
};

export const MongoFilterBehaviour: FilterBehaviour = {
  compilerType: 'mongoCondition',
  supportEquals: true,
  supportArrayTesting: true,
  supportNumberLikeComparison: true,
  supportStringInclusion: true,
  supportBooleanValues: true,
  supportExistsTesting: true,
};

export const EvalFilterBehaviour: FilterBehaviour = {
  compilerType: 'sqlTree',
  supportEquals: true,
  supportStringInclusion: true,
  supportEmpty: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,

  allowStringToken: true,
};
