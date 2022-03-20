import _escapeRegExp from 'lodash/escapeRegExp';
import _isString from 'lodash/isString';
import _compact from 'lodash/compact';

interface CompiledPermissions {
  revoke: RegExp;
  allow: RegExp;
}

function compileRegexp(permissions) {
  if (permissions.length == 0) return null;
  return new RegExp(permissions.map(x => '^' + _escapeRegExp(x).replace(/\\\*/g, '.*') + '$').join('|'));
}

export function compilePermissions(permissions: string[] | string): CompiledPermissions {
  if (!permissions) return null;
  if (_isString(permissions)) permissions = permissions.split(',');
  permissions = _compact(permissions.map(x => x.trim()));
  const revoke = permissions.filter(x => x.startsWith('~')).map(x => x.substring(1));
  const allow = permissions.filter(x => !x.startsWith('~'));
  return {
    revoke: compileRegexp(revoke),
    allow: compileRegexp(allow),
  };
}

export function testPermission(tested: string, permissions: CompiledPermissions) {
  if (!permissions) return true;
  if (!permissions.revoke) return true;

  if (tested.match(permissions.revoke)) {
    if (!tested.match(permissions.allow)) {
      return false;
    }
  }

  return true;
}
