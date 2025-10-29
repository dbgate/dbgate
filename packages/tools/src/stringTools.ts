import _isString from 'lodash/isString';
import _isArray from 'lodash/isArray';
import _isDate from 'lodash/isDate';
import _isNumber from 'lodash/isNumber';
import _isPlainObject from 'lodash/isPlainObject';
import _pad from 'lodash/pad';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import _isEmpty from 'lodash/isEmpty';
import _omitBy from 'lodash/omitBy';
import { DataEditorTypesBehaviour } from 'dbgate-types';
import isPlainObject from 'lodash/isPlainObject';
import md5 from 'blueimp-md5';

export const MAX_GRID_TEXT_LENGTH = 1000; // maximum length of text in grid cell, longer text is truncated

export type EditorDataType =
  | 'null'
  | 'objectid'
  | 'string'
  | 'number'
  | 'object'
  | 'date'
  | 'array'
  | 'boolean'
  | 'unknown';

const dateTimeStorageRegex =
  /^([0-9]+)-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])[Tt]([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(([Zz])|()|([\+|\-]([01][0-9]|2[0-3]):[0-5][0-9]))$/;

const dateTimeParseRegex =
  /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2}):(\d{2})(\.[0-9]+)?(([Zz])|()|([\+|\-]([01][0-9]|2[0-3]):[0-5][0-9]))$/;

export function arrayToHexString(byteArray) {
  return byteArray.reduce((output, elem) => output + ('0' + elem.toString(16)).slice(-2), '').toUpperCase();
}

export function hexStringToArray(inputString) {
  var hex = inputString.toString();
  var res = [];
  for (var n = 0; n < hex.length; n += 2) {
    res.push(parseInt(hex.substr(n, 2), 16));
  }
  return res;
}

export function base64ToHex(base64String) {
  const binaryString = atob(base64String);
  const hexString = Array.from(binaryString, c =>
    c.charCodeAt(0).toString(16).padStart(2, '0')
  ).join('');
  return '0x' + hexString.toUpperCase();
};

export function parseCellValue(value, editorTypes?: DataEditorTypesBehaviour) {
  if (!_isString(value)) return value;

  if (editorTypes?.parseSqlNull) {
    if (value == '(NULL)') return null;
  }

  if (editorTypes?.parseHexAsBuffer) {
    const mHex = value.match(/^0x([0-9a-fA-F][0-9a-fA-F])+$/);
    if (mHex) {
      return {
        type: 'Buffer',
        data: hexStringToArray(value.substring(2)),
      };
    }
  }

  if (editorTypes?.parseObjectIdAsDollar) {
    const mOid = value.match(/^ObjectId\("([0-9a-f]{24})"\)$/);
    if (mOid) {
      return { $oid: mOid[1] };
    }
  }

  if (editorTypes?.parseDateAsDollar) {
    const m = value.match(dateTimeParseRegex);
    if (m) {
      return {
        $date: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`,
      };
    }
  }

  if (editorTypes?.parseGeopointAsDollar) {
    const m = value.match(/^([\d\.]+)\s*°\s*([NS]),\s*([\d\.]+)\s*°\s*([EW])$/i);
    if (m) {
      let latitude = parseFloat(m[1]);
      const latDir = m[2].toUpperCase();
      let longitude = parseFloat(m[3]);
      const lonDir = m[4].toUpperCase();

      if (latDir === 'S') latitude = -latitude;
      if (lonDir === 'W') longitude = -longitude;

      return {
        $geoPoint: {
          latitude,
          longitude,
        },
      };
    }
  }

  if (editorTypes?.parseFsDocumentRefAsDollar) {
    const trimmedValue = value.replace(/\s/g, '');
    if (trimmedValue.startsWith('$ref:')) {
      return {
        $fsDocumentRef: {
          documentPath: trimmedValue.slice(5),
        },
      };
    }
  }

  if (editorTypes?.parseJsonNull) {
    if (value == 'null') return null;
  }

  if (editorTypes?.parseJsonBoolean) {
    if (value == 'true') return true;
    if (value == 'false') return false;
  }

  if (editorTypes?.parseNumber) {
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(value)) {
      return parseNumberSafe(value);
    }
  }

  if (editorTypes?.parseJsonArray || editorTypes?.parseJsonObject) {
    const jsonValue = safeJsonParse(value);
    if (_isPlainObject(jsonValue) && editorTypes?.parseJsonObject) return jsonValue;
    if (_isArray(jsonValue) && editorTypes?.parseJsonArray) return jsonValue;
  }

  return value;
}

function parseFunc_ObjectIdAsDollar(value) {
  if (value?.$oid) return value;
  if (_isString(value)) {
    if (value.match(/^[0-9a-f]{24}$/)) return { $oid: value };
    const mOid = value.match(/^ObjectId\("([0-9a-f]{24})"\)$/);
    if (mOid) {
      return { $oid: mOid[1] };
    }
  }
  return value;
}

function parseFunc_DateAsDollar(value) {
  if (value?.$date) return value;
  if (_isString(value)) {
    const m = value.match(dateTimeParseRegex);
    if (m) {
      return { $date: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` };
    }
  }
  return value;
}

function makeBulletString(value) {
  return _pad('', value.length, '•');
}

function highlightSpecialCharacters(value) {
  value = value.replace(/\n/g, '↲');
  value = value.replace(/\r/g, '');
  value = value.replace(/^(\s+)/, makeBulletString);
  value = value.replace(/(\s+)$/, makeBulletString);
  value = value.replace(/(\s\s+)/g, makeBulletString);
  return value;
}

function stringifyJsonToGrid(value): ReturnType<typeof stringifyCellValue> {
  if (_isPlainObject(value)) {
    const svalue = JSON.stringify(value, undefined, 2);
    if (svalue.length < 100) {
      return { value: svalue, gridStyle: 'nullCellStyle' };
    } else {
      return { value: '(JSON)', gridStyle: 'nullCellStyle', gridTitle: svalue };
    }
  }
  if (_isArray(value)) {
    return {
      value: `[${value.length} items]`,
      gridStyle: 'nullCellStyle',
      gridTitle: value.map(x => JSON.stringify(x)).join('\n'),
    };
  }
  return { value: '(JSON)', gridStyle: 'nullCellStyle' };
}

export function stringifyCellValue(
  value,
  intent:
    | 'gridCellIntent'
    | 'inlineEditorIntent'
    | 'multilineEditorIntent'
    | 'stringConversionIntent'
    | 'exportIntent'
    | 'clipboardIntent',
  editorTypes?: DataEditorTypesBehaviour,
  gridFormattingOptions?: { useThousandsSeparator?: boolean },
  jsonParsedValue?: any
): {
  value: string;
  gridStyle?: 'textCellStyle' | 'valueCellStyle' | 'nullCellStyle'; // only for gridCellIntent
  gridTitle?: string; // only for gridCellIntent
} {
  if (editorTypes?.parseSqlNull) {
    if (value === null) {
      switch (intent) {
        case 'exportIntent':
          return { value: '' };
        default:
          return { value: '(NULL)', gridStyle: 'nullCellStyle' };
      }
    }
  }
  if (value === undefined) {
    switch (intent) {
      case 'gridCellIntent':
        return { value: '(No Field)', gridStyle: 'nullCellStyle' };
      default:
        return { value: '' };
    }
  }
  if (editorTypes?.parseJsonNull) {
    if (value === null) {
      return { value: 'null', gridStyle: 'valueCellStyle' };
    }
  }

  if (value === true) return { value: 'true', gridStyle: 'valueCellStyle' };
  if (value === false) return { value: 'false', gridStyle: 'valueCellStyle' };

  if (value?.$binary?.base64) {
    return {
      value: base64ToHex(value.$binary.base64),
      gridStyle: 'valueCellStyle',
    };
  }

  if (editorTypes?.parseHexAsBuffer) {
    if (value?.type == 'Buffer' && _isArray(value.data)) {
      return { value: '0x' + arrayToHexString(value.data), gridStyle: 'valueCellStyle' };
    }
  }
  if (editorTypes?.parseObjectIdAsDollar) {
    if (value?.$oid) {
      switch (intent) {
        case 'exportIntent':
        case 'stringConversionIntent':
          return { value: value.$oid };
        default:
          return { value: `ObjectId("${value.$oid}")`, gridStyle: 'valueCellStyle' };
      }
    }
  }
  if (value?.$bigint) {
    return {
      value: value.$bigint,
      gridStyle: 'valueCellStyle',
    };
  }
  if (typeof value === 'bigint') {
    return {
      value: value.toString(),
      gridStyle: 'valueCellStyle',
    };
  }

  if (editorTypes?.parseDateAsDollar) {
    if (value?.$date) {
      const dateString = _isDate(value.$date) ? value.$date.toISOString() : value.$date.toString();
      switch (intent) {
        case 'exportIntent':
        case 'stringConversionIntent':
        case 'clipboardIntent':
          return { value: dateString };
        default:
          const m = dateString.match(dateTimeStorageRegex);
          if (m) {
            return { value: `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`, gridStyle: 'valueCellStyle' };
          } else {
            return { value: dateString.replace('T', ' '), gridStyle: 'valueCellStyle' };
          }
      }
    }
  }

  if (editorTypes?.parseGeopointAsDollar) {
    if (value?.$geoPoint) {
      const { latitude, longitude } = value.$geoPoint;
      if (_isNumber(latitude) && _isNumber(longitude)) {
        const latAbs = Math.abs(latitude);
        const lonAbs = Math.abs(longitude);
        const latDir = latitude >= 0 ? 'N' : 'S';
        const lonDir = longitude >= 0 ? 'E' : 'W';

        return {
          value: `${latAbs}° ${latDir}, ${lonAbs}° ${lonDir}`,
          gridStyle: 'valueCellStyle',
        };
      }
    }
  }

  if (editorTypes?.parseFsDocumentRefAsDollar) {
    if (value?.$fsDocumentRef) {
      return {
        value: `$ref: ${value.$fsDocumentRef.documentPath ?? ''}`,
        gridStyle: 'valueCellStyle',
      };
    }
  }

  if (_isArray(value)) {
    switch (intent) {
      case 'gridCellIntent':
        return stringifyJsonToGrid(value);
      case 'multilineEditorIntent':
        return { value: JSON.stringify(value, null, 2) };
      default:
        return { value: JSON.stringify(value), gridStyle: 'valueCellStyle' };
    }
  }

  if (_isPlainObject(value)) {
    switch (intent) {
      case 'gridCellIntent':
        return stringifyJsonToGrid(value);
      case 'multilineEditorIntent':
        return { value: JSON.stringify(value, null, 2) };
      default:
        return { value: JSON.stringify(value), gridStyle: 'valueCellStyle' };
    }
  }

  if (_isNumber(value)) {
    switch (intent) {
      case 'gridCellIntent':
        return {
          value:
            gridFormattingOptions?.useThousandsSeparator && (value >= 10000 || value <= -10000)
              ? value.toLocaleString()
              : value.toString(),
          gridStyle: 'valueCellStyle',
        };
      default:
        return { value: value.toString() };
    }
  }

  if (_isString(value)) {
    switch (intent) {
      case 'gridCellIntent':
        if (jsonParsedValue && !editorTypes?.explicitDataType) {
          return stringifyJsonToGrid(jsonParsedValue);
        } else {
          if (!editorTypes?.explicitDataType) {
            // reformat datetime for implicit date types
            const m = value.match(dateTimeStorageRegex);
            if (m) {
              return {
                value: `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`,
                gridStyle: 'valueCellStyle',
              };
            }
          }
          const valueLimited =
            value.length > MAX_GRID_TEXT_LENGTH ? value.substring(0, MAX_GRID_TEXT_LENGTH) + '...' : value;
          return { value: highlightSpecialCharacters(valueLimited), gridStyle: 'textCellStyle' };
        }
      default:
        return { value: value };
    }
  }

  if (value === null || value === undefined) {
    switch (intent) {
      case 'gridCellIntent':
        return { value: '(n/a)', gridStyle: 'nullCellStyle' };
      default:
        return { value: '' };
    }
  }

  switch (intent) {
    case 'gridCellIntent':
      return { value: '(Unknown)', gridStyle: 'nullCellStyle' };
    default:
      return { value: '' };
  }
}

export function safeJsonParse(json, defaultValue?, logError = false) {
  if (_isArray(json) || _isPlainObject(json)) {
    return json;
  }
  if (!json) {
    return defaultValue;
  }
  try {
    return JSON.parse(json);
  } catch (err) {
    if (logError) {
      console.error(`Error parsing JSON value "${json}"`, err);
    }
    return defaultValue;
  }
}

export function safeCompileRegExp(regex: string, flags: string) {
  try {
    return new RegExp(regex, flags);
  } catch (err) {
    return null;
  }
}

export function shouldOpenMultilineDialog(value) {
  if (_isString(value)) {
    if (value.includes('\n')) {
      return true;
    }
    const parsed = safeJsonParse(value);
    if (parsed && (_isPlainObject(parsed) || _isArray(parsed))) {
      return true;
    }
  }
  if (value?.$oid) {
    return false;
  }
  if (value?.$date) {
    return false;
  }
  if (value?.$bigint) {
    return false;
  }
  if (_isPlainObject(value) || _isArray(value)) {
    return true;
  }
  return false;
}

export function isJsonLikeLongString(value) {
  return _isString(value) && value.length > 100 && value.match(/^\s*\{.*\}\s*$|^\s*\[.*\]\s*$/m);
}

export function getIconForRedisType(type) {
  switch (type) {
    case 'dir':
      return 'img folder';
    case 'string':
      return 'img type-string';
    case 'hash':
      return 'img type-hash';
    case 'set':
      return 'img type-set';
    case 'list':
      return 'img type-list';
    case 'zset':
      return 'img type-zset';
    case 'stream':
      return 'img type-stream';
    case 'binary':
      return 'img type-binary';
    case 'ReJSON-RL':
      return 'img type-rejson';
    default:
      return null;
  }
}

export function isWktGeometry(s) {
  if (!_isString(s)) return false;

  // return !!s.match(/^POINT\s*\(|/)
  return !!s.match(
    /^POINT\s*\(|^LINESTRING\s*\(|^POLYGON\s*\(|^MULTIPOINT\s*\(|^MULTILINESTRING\s*\(|^MULTIPOLYGON\s*\(|^GEOMCOLLECTION\s*\(|^GEOMETRYCOLLECTION\s*\(/
  );
}

export function arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = [].slice.call(new Uint8Array(buffer));
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function getAsImageSrc(obj) {
  if (obj?.type == 'Buffer' && _isArray(obj?.data)) {
    return `data:image/png;base64, ${arrayBufferToBase64(obj?.data)}`;
  }

  if (_isString(obj) && (obj.startsWith('http://') || obj.startsWith('https://'))) {
    return obj;
  }

  return null;
}

export function parseSqlDefaultValue(value: string) {
  if (!value) return undefined;
  if (!_isString(value)) return undefined;
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (!isNaN(value as any) && !isNaN(parseFloat(value))) {
    return parseFloat(value);
  }
  return undefined;
}

export function detectCellDataType(value): EditorDataType {
  if (value === null) return 'null';
  if (value?.$oid) return 'objectid';
  if (value?.$date) return 'date';
  if (_isString(value)) return 'string';
  if (_isNumber(value)) return 'number';
  if (_isPlainObject(value)) return 'object';
  if (_isArray(value)) return 'array';
  if (value === true || value === false) return 'boolean';
  return 'unknown';
}

export function detectTypeIcon(value) {
  switch (detectCellDataType(value)) {
    case 'null':
      return 'icon type-null';
    case 'objectid':
      return 'icon type-objectid';
    case 'date':
      return 'icon type-date';
    case 'string':
      return 'icon type-string';
    case 'number':
      return 'icon type-number';
    case 'object':
      return 'icon type-object';
    case 'array':
      return 'icon type-array';
    case 'boolean':
      return 'icon type-boolean';
    default:
      return 'icon type-unknown';
  }
}

export function getConvertValueMenu(value, onSetValue, editorTypes?: DataEditorTypesBehaviour) {
  return [
    editorTypes?.supportStringType && {
      text: 'String',
      onClick: () => onSetValue(stringifyCellValue(value, 'stringConversionIntent', editorTypes).value),
    },
    editorTypes?.supportNumberType && { text: 'Number', onClick: () => onSetValue(parseFloat(value)) },
    editorTypes?.supportNullType && { text: 'Null', onClick: () => onSetValue(null) },
    editorTypes?.supportBooleanType && {
      text: 'Boolean',
      onClick: () => onSetValue(value?.toString()?.toLowerCase() == 'true' || value == '1'),
    },
    editorTypes?.supportObjectIdType && {
      text: 'ObjectId',
      onClick: () => onSetValue(parseFunc_ObjectIdAsDollar(value)),
    },
    editorTypes?.supportDateType && { text: 'Date', onClick: () => onSetValue(parseFunc_DateAsDollar(value)) },
    editorTypes?.supportJsonType && {
      text: 'JSON',
      onClick: () => {
        const jsonValue = safeJsonParse(value);
        if (jsonValue != null) {
          onSetValue(jsonValue);
        }
      },
    },
  ];
}

export function extractErrorMessage(err, defaultMessage = 'Unknown error') {
  if (!err) {
    return defaultMessage;
  }
  if (_isArray(err.errors)) {
    try {
      return err.errors.map(x => x.message).join('\n');
    } catch (e2) {}
  }
  if (err.message) {
    return err.message;
  }
  const s = `${err}`;
  if (s && (!s.endsWith('Error') || s.includes(' '))) {
    return s;
  }
  return defaultMessage;
}

export function extractErrorStackTrace(err) {
  const { stack } = err;
  if (!_isString(stack)) return undefined;
  if (stack.length > 1000) return stack.substring(0, 1000) + '... (truncated)';
  return stack;
}

export function extractErrorLogData(err, additionalFields = {}) {
  if (!err) return null;
  return {
    errorMessage: extractErrorMessage(err),
    errorObject: err,
    errorStack: extractErrorStackTrace(err),
    ...additionalFields,
  };
}

export function safeFormatDate(date) {
  try {
    const v = new Date(date);
    return v.toISOString().substring(0, 10);
  } catch (e) {
    return date?.toString();
  }
}

export function getLimitedQuery(sql: string): string {
  if (!sql) {
    return sql;
  }
  if (sql.length > 1000) {
    return sql.substring(0, 1000) + '...';
  }
  return sql;
}

export function pinoLogRecordToMessageRecord(logRecord, defaultSeverity = 'info') {
  const { level, time, msg, ...rest } = logRecord;

  const levelToSeverity = {
    10: 'debug',
    20: 'debug',
    30: 'info',
    40: 'info',
    50: 'error',
    60: 'error',
  };

  return {
    ...rest,
    time,
    message: msg,
    severity: levelToSeverity[level] ?? defaultSeverity,
  };
}

export function jsonLinesStringify(jsonArray: any[]): string {
  return jsonArray.map(json => JSON.stringify(json)).join('\n');
}
export function jsonLinesParse(jsonLines: string): any[] {
  return jsonLines
    .split('\n')
    .filter(x => x.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(x => x);
}

export function serializeJsTypesForJsonStringify(obj, replacer = null) {
  return _cloneDeepWith(obj, value => {
    if (typeof value === 'bigint') {
      return { $bigint: value.toString() };
    }
    if (replacer) {
      return replacer(value);
    }
  });
}

export function deserializeJsTypesFromJsonParse(obj) {
  return _cloneDeepWith(obj, value => {
    if (value?.$bigint) {
      return BigInt(value.$bigint);
    }
  });
}

export function serializeJsTypesReplacer(key, value) {
  if (typeof value === 'bigint') {
    return { $bigint: value.toString() };
  }
  return value;
}

export function deserializeJsTypesReviver(key, value) {
  if (value?.$bigint) {
    return BigInt(value.$bigint);
  }
  return value;
}

export function parseNumberSafe(value) {
  if (/^-?[0-9]+$/.test(value)) {
    const parsed = parseInt(value);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
    return BigInt(value);
  }
  return parseFloat(value);
}

const frontMatterRe = /^--\ >>>[ \t\r]*\n(.*)\n-- <<<[ \t\r]*\n/s;

export function getSqlFrontMatter(text: string, yamlModule) {
  if (!text || !_isString(text)) return null;
  const match = text.match(frontMatterRe);
  if (!match) return null;
  const yamlContentMapped = match[1].replace(/^--[ ]?/gm, '');
  return yamlModule.load(yamlContentMapped);
}

export function removeSqlFrontMatter(text: string) {
  if (!text || !_isString(text)) return null;
  return text.replace(frontMatterRe, '');
}

export function setSqlFrontMatter(text: string, data: { [key: string]: any }, yamlModule) {
  const textClean = removeSqlFrontMatter(text);

  if (!isPlainObject(data)) {
    return textClean;
  }

  const dataClean = _omitBy(data, v => v === undefined);

  if (_isEmpty(dataClean)) {
    return textClean;
  }
  const yamlContent = yamlModule.dump(dataClean);
  const yamlContentMapped = yamlContent
    .trimRight()
    .split('\n')
    .map(line => '-- ' + line)
    .join('\n');
  const frontMatterContent = `-- >>>\n${yamlContentMapped}\n-- <<<\n`;
  return frontMatterContent + (textClean || '');
}

export function shortenIdentifier(s: string, maxLength?: number) {
  if (!maxLength || maxLength < 10) return s;
  if (s.length <= maxLength) return s;
  const hash = md5(s).substring(0, 8);
  const partLength = Math.floor((maxLength - 9) / 2);
  const restLength = maxLength - 10 - partLength;
  return s.substring(0, partLength) + '_' + hash + '_' + s.substring(s.length - restLength);
}
