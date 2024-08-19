export type FilterParserCompilerType = 'sqlTree' | 'mongoCondition' | 'datetime';

export interface StructuredFilterType {
  compilerType: FilterParserCompilerType;

  supportEquals?: boolean;
  supportStringInclusion?: boolean;
  supportEmpty?: boolean;
  supportNumberLikeComparison?: boolean;
  supportDatetimeComparison?: boolean;
  supportDatetimeSymbols?: boolean;
  supportNullTesting?: boolean;
  supportExistsTesting?: boolean;
  supportBooleanValues?: boolean;
  supportSqlCondition?: boolean;
  supportArrayTesting?: boolean;

  allowStringToken?: boolean;
  allowNumberToken?: boolean;
  allowHexString?: boolean;
}
