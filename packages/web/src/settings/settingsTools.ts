import _ from 'lodash';
import { getCurrentSettings } from '../stores';

export function getIntSettingsValue(name, defaultValue, min = null, max = null) {
  const settings = getCurrentSettings();
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

export function getBoolSettingsValue(name, defaultValue) {
  const settings = getCurrentSettings();
  const res = settings[name];
  if (res == null) return defaultValue;
  return !!res;
}
