import _isString from 'lodash/isString';
import _isArray from 'lodash/isArray';
import _isNumber from 'lodash/isNumber';
import _isPlainObject from 'lodash/isPlainObject';
import { DataEditorTypesBehaviour } from 'dbgate-types';

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

export function stringifyCellValue(value, editorTypes?: DataEditorTypesBehaviour) {
  if (editorTypes?.parseSqlNull) {
    if (value === null) return '(NULL)';
  }
  if (value === undefined) return '(NoField)';
  if (editorTypes?.parseJsonNull) {
    if (value === null) return 'null';
  }
  if (editorTypes?.parseJsonBoolean) {
    if (value === true) return 'true';
    if (value === false) return 'false';
  }
  if (editorTypes?.parseHexAsBuffer) {
    if (value?.type == 'Buffer' && _isArray(value.data)) return '0x' + arrayToHexString(value.data);
  }
  if (editorTypes?.parseObjectIdAsDollar) {
    if (value?.$oid) return `ObjectId("${value?.$oid}")`;
  }
  if (editorTypes?.parseJsonArray) {
    if (_isArray(value)) return JSON.stringify(value);
  }
  if (editorTypes?.parseJsonObject) {
    if (_isPlainObject(value)) return JSON.stringify(value);
  }
  if (editorTypes?.parseNumber) {
    if (_isNumber(value)) return value.toString();
  }

  if (_isString(value)) return value;

  // fallback
  if (_isNumber(value)) return value.toString();
  if (value === null || value === undefined) return '';

  return '';
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
      onClick: () => onSetValue(stringifyCellValue(value, editorTypes)),
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
