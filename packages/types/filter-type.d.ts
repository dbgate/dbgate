export interface FilterBehaviour {
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
  supportEmptyArrayTesting?: boolean;
  supportNotEmptyArrayTesting?: boolean;
  supportBooleanOrNull?: boolean;

  allowStringToken?: boolean;
  allowNumberToken?: boolean;
  allowHexString?: boolean;
  allowNumberDualTesting?: boolean;
  allowObjectIdTesting?: boolean;

  passBooleans?: boolean;
  passNumbers?: boolean;

  disableOr?: boolean;
}
