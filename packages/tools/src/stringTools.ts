import _isString from 'lodash/isString';
import _isArray from 'lodash/isArray';
import _isPlainObject from 'lodash/isPlainObject';

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

export function parseCellValue(value) {
  if (!_isString(value)) return value;

  if (value == '(NULL)') return null;

  const mHex = value.match(/^0x([0-9a-fA-F][0-9a-fA-F])+$/);
  if (mHex) {
    return {
      type: 'Buffer',
      data: hexStringToArray(value.substring(2)),
    };
  }

  const mOid = value.match(/^ObjectId\("([0-9a-f]{24})"\)$/);
  if (mOid) {
    return { $oid: mOid[1] };
  }

  return value;
}

export function stringifyCellValue(value) {
  if (value === null) return '(NULL)';
  if (value === undefined) return '(NoField)';
  if (value?.type == 'Buffer' && _isArray(value.data)) return '0x' + arrayToHexString(value.data);
  if (value?.$oid) return `ObjectId("${value?.$oid}")`;
  if (_isPlainObject(value) || _isArray(value)) return JSON.stringify(value);
  return value;
}

export function safeJsonParse(json, defaultValue?, logError = false) {
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
