import _isString from 'lodash/isString';
import _isArray from 'lodash/isArray';
import _isNumber from 'lodash/isNumber';
import _isPlainObject from 'lodash/isPlainObject';
import _pad from 'lodash/pad';
import { DataEditorTypesBehaviour } from 'dbgate-types';

const dateTimeRegex =
  /^([0-9]+)-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])[Tt]([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(([Zz])|()|([\+|\-]([01][0-9]|2[0-3]):[0-5][0-9]))$/;

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

  if (editorTypes?.parseJsonNull) {
    if (value == 'null') return null;
  }

  if (editorTypes?.parseJsonBoolean) {
    if (value == 'true') return true;
    if (value == 'false') return false;
  }

  if (editorTypes?.parseNumber) {
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(value)) {
      return parseFloat(value);
    }
  }

  if (editorTypes?.parseJsonArray || editorTypes?.parseJsonObject) {
    const jsonValue = safeJsonParse(value);
    if (_isPlainObject(jsonValue) && editorTypes?.parseJsonObject) return jsonValue;
    if (_isArray(jsonValue) && editorTypes?.parseJsonArray) return jsonValue;
  }

  return value;
}

function parseObjectIdAsDollar(value) {
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
  intent: 'gridCellIntent' | 'inlineEditorIntent' | 'multilineEditorIntent' | 'stringConversionIntent' | 'exportIntent',
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
  if (editorTypes?.parseJsonArray) {
    if (_isArray(value)) {
      switch (intent) {
        case 'gridCellIntent':
          return stringifyJsonToGrid(value);
        case 'multilineEditorIntent':
          return { value: JSON.stringify(value) };
        default:
          return { value: JSON.stringify(value, null, 2), gridStyle: 'valueCellStyle' };
      }
    }
  }
  if (editorTypes?.parseJsonObject) {
    if (_isPlainObject(value)) {
      switch (intent) {
        case 'gridCellIntent':
          return stringifyJsonToGrid(value);
        case 'multilineEditorIntent':
          return { value: JSON.stringify(value) };
        default:
          return { value: JSON.stringify(value, null, 2), gridStyle: 'valueCellStyle' };
      }
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
            const m = value.match(dateTimeRegex);
            if (m) {
              return {
                value: `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`,
                gridStyle: 'valueCellStyle',
              };
            }
          }
          return { value: highlightSpecialCharacters(value), gridStyle: 'textCellStyle' };
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
  try {
    return JSON.parse(json);
  } catch (err) {
    if (logError) {
      console.error(`Error parsing JSON value "${json}"`, err);
    }
    return defaultValue;
  }
}

export function isJsonLikeLongString(value) {
  return _isString(value) && value.length > 100 && value.match(/^\s*\{.*\}\s*$|^\s*\[.*\]\s*$/);
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

export function detectTypeIcon(value) {
  if (value === null) return 'icon type-null';
  if (value?.$oid) return 'icon type-objectid';
  if (_isString(value)) return 'icon type-string';
  if (_isNumber(value)) return 'icon type-number';
  if (_isPlainObject(value)) return 'icon type-object';
  if (_isArray(value)) return 'icon type-array';
  if (value === true || value === false) return 'icon type-boolean';
  return 'icon type-unknown';
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
    editorTypes?.supportObjectIdType && { text: 'ObjectId', onClick: () => onSetValue(parseObjectIdAsDollar(value)) },
    editorTypes?.supportJsonType && {
      text: 'JSON',
      onClick: () => {
        const jsonValue = safeJsonParse(value);
        if (jsonValue != null) {
          console.log('**** ON SET VALUE', jsonValue);
          onSetValue(jsonValue);
        }
      },
    },
  ];
}
