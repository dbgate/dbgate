import _ from 'lodash';

export default function getAsArray(obj) {
  if (_.isArray(obj)) return obj;
  if (obj != null) return [obj];
  return [];
}
