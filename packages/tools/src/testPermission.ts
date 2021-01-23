import _escapeRegExp from 'lodash/escapeRegExp';
import _isString from 'lodash/isString';

export function compilePermissions(permissions: string[] | string) {
  if (!permissions) return null;
  if (_isString(permissions)) permissions = permissions.split(',');
  return permissions.map(x => new RegExp('^' + _escapeRegExp(x).replace(/\\\*/g, '.*') + '$'));
}

export function testPermission(tested: string, permissions: RegExp[]) {
  if (!permissions) return true;
  for (const permission of permissions) {
    if (tested.match(permission)) return true;
  }
  return false;
}
