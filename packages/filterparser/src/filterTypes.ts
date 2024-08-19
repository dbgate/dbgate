import { StructuredFilterType } from 'dbgate-types';

export const NumberFilterType: StructuredFilterType = {
  compilerType: 'sqlTree',
  supportEquals: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,
  supportSqlCondition: true,
};

export const StringFilterType: StructuredFilterType = {
  compilerType: 'sqlTree',
  supportEquals: true,
  supportStringInclusion: true,
  supportEmpty: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,
  supportSqlCondition: true,
};

export const LogicalFilterType: StructuredFilterType = {
  compilerType: 'sqlTree',
  supportBooleanValues: true,
  supportNullTesting: true,
  supportSqlCondition: true,
};

export const DatetimeFilterType: StructuredFilterType = {
  compilerType: 'sqlTree',
  supportNullTesting: true,
  supportSqlCondition: true,
  supportDatetimeSymbols: true,
  supportDatetimeComparison: true,
};

export const MongoFilterType: StructuredFilterType = {
  compilerType: 'mongoCondition',
  supportEquals: true,
  supportArrayTesting: true,
  supportNumberLikeComparison: true,
  supportStringInclusion: true,
  supportBooleanValues: true,
  supportExistsTesting: true,
};

export const EvalFilterType: StructuredFilterType = {
  compilerType: 'sqlTree',
  supportEquals: true,
  supportStringInclusion: true,
  supportEmpty: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,
};
