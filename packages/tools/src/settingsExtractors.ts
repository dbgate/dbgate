import _ from 'lodash';

export function extractIntSettingsValue(settings, name, defaultValue, min = null, max = null) {
  const parsed = parseInt(settings[name]);
  if (_.isNaN(parsed)) {
    return defaultValue;
  }
  if (_.isNumber(parsed)) {
    if (min != null && parsed < min) return min;
    if (max != null && parsed > max) return max;
    return parsed;
  }
  return defaultValue;
}

export function extractBoolSettingsValue(settings, name, defaultValue) {
  const res = settings[name];
  if (res == null) return defaultValue;
  return !!res;
}
