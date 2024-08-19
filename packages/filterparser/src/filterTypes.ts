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
};

export const EvalFilterType: StructuredFilterType = {
  compilerType: 'sqlTree',
  supportEquals: true,
  supportStringInclusion: true,
  supportEmpty: true,
  supportNumberLikeComparison: true,
  supportNullTesting: true,
};

// export const NumberFilterType: StructuredFilterType = {
//   compilerType: 'sqlTree',
//   allowedOperators: [
//     { value: '=', label: 'equals' },
//     { value: '<>', label: 'does not equal' },
//     { value: '<', label: 'is smaller' },
//     { value: '>', label: 'is greater' },
//     { value: '<=', label: 'is smaller or equal' },
//     { value: '>=', label: 'is greater or equal' },
//     { value: 'NULL', label: 'is NULL' },
//     { value: 'NOT NULL', label: 'is not NULL' },
//     { value: 'sql', label: 'SQL condition' },
//     { value: 'sqlRight', label: 'SQL condition - right side only' },
//   ],
// };

// export const StringFilterType: StructuredFilterType = {
//   compilerType: 'sqlTree',
//   allowedOperators: [
//     { value: '+', label: 'contains' },
//     { value: '~', label: 'does not contain' },
//     { value: '^', label: 'begins with' },
//     { value: '!^', label: 'does not begin with' },
//     { value: '$', label: 'ends with' },
//     { value: '!$', label: 'does not end with' },
//     { value: '=', label: 'equals' },
//     { value: '<>', label: 'does not equal' },
//     { value: '<', label: 'is smaller' },
//     { value: '>', label: 'is greater' },
//     { value: '<=', label: 'is smaller or equal' },
//     { value: '>=', label: 'is greater or equal' },
//     { value: 'NULL', label: 'is NULL' },
//     { value: 'NOT NULL', label: 'is not NULL' },
//     { value: 'sql', label: 'SQL condition' },
//     { value: 'sqlRight', label: 'SQL condition - right side only' },
//   ],
// };

// export const DatetimeFilterType: StructuredFilterType = {
//   compilerType: 'sqlTree',
//   allowedOperators: [
//     { value: '=', label: 'equals' },
//     { value: '<>', label: 'does not equal' },
//     { value: '<', label: 'is before' },
//     { value: '>', label: 'is after' },
//     { value: '<=', label: 'is before or equal' },
//     { value: '>=', label: 'is after or equal' },
//     { value: 'NULL', label: 'is NULL' },
//     { value: 'NOT NULL', label: 'is not NULL' },
//     { value: 'sql', label: 'SQL condition' },
//     { value: 'sqlRight', label: 'SQL condition - right side only' },
//   ],
// };

// export const MongoFilterType: StructuredFilterType = {
//   compilerType: 'mongoCondition',
//   allowedOperators: [
//     { value: '=', label: 'equals' },
//     { value: '<>', label: 'does not equal' },
//     { value: '<', label: 'is smaller' },
//     { value: '>', label: 'is greater' },
//     { value: '<=', label: 'is smaller or equal' },
//     { value: '>=', label: 'is greater or equal' },
//     { value: '+', label: 'contains' },
//     { value: '~', label: 'does not contain' },
//     { value: '^', label: 'begins with' },
//     { value: '!^', label: 'does not begin with' },
//     { value: '$', label: 'ends with' },
//     { value: '!$', label: 'does not end with' },
//     { value: 'EXISTS', label: 'field exists' },
//     { value: 'NOT EXISTS', label: 'field does not exist' },
//   ],
// };

// export const EvalFilterType: StructuredFilterType = {
//   compilerType: 'sqlTree',
//   allowedOperators: [
//     { value: '=', label: 'equals' },
//     { value: '<>', label: 'does not equal' },
//     { value: '<', label: 'is smaller' },
//     { value: '>', label: 'is greater' },
//     { value: '<=', label: 'is smaller or equal' },
//     { value: '>=', label: 'is greater or equal' },
//     { value: '+', label: 'contains' },
//     { value: '~', label: 'does not contain' },
//     { value: '^', label: 'begins with' },
//     { value: '!^', label: 'does not begin with' },
//     { value: '$', label: 'ends with' },
//     { value: '!$', label: 'does not end with' },
//     { value: 'NULL', label: 'is NULL' },
//     { value: 'NOT NULL', label: 'is not NULL' },
//   ],
// };
