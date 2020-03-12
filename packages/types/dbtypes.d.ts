export type DbSizeType = 'small' | 'medium' | 'tiny' | 'long';

export interface DbTypeDatetime {
  typeCode: 'datetime';
  subType?: 'date' | 'datetime' | 'time' | 'year' | 'interval';
  extendedPrecision?: boolean;
  hasTimeZone?: boolean;
}

export interface DbTypeBlob {
  typeCode: 'blob';
  size?: DbSizeType;
  isText?: boolean;
  isUnicode?: boolean;
  isXml?: boolean;
}

export interface DbTypeFloat {
  typeCode: 'float';
  bytes?: number;
  isMoney?: boolean;
}

export interface DbTypeGeneric {
  typeCode: 'generic';
  sql: string;
}

export interface DbTypeLogical {
  typeCode: 'logical';
}

export interface DbTypeNumeric {
  typeCode: 'numeric';
  precision?: number;
  scale?: number;
  autoIncrement?: boolean;
}

export interface DbTypeString {
  typeCode: 'string';
  length?: number;
  isUnicode?: boolean;
  isBinary?: boolean;
  isBit?: boolean;
  isVarLength?: boolean;
  isBlob?: boolean;
}

export interface DbTypeInt {
  typeCode: 'int';
  bytes?: number;
  autoIncrement?: boolean;
}

export type DbType =
  | DbTypeDatetime
  | DbTypeBlob
  | DbTypeFloat
  | DbTypeGeneric
  | DbTypeLogical
  | DbTypeNumeric
  | DbTypeString
  | DbTypeInt;

export type DbTypeCode = DbType['typeCode'];
