import _escapeRegExp from 'lodash/escapeRegExp';
import _isString from 'lodash/isString';
import _compact from 'lodash/compact';
import _flatten from 'lodash/flatten';

interface CompiledPermissionLevel {
  re: RegExp;
  type: 'allow' | 'deny';
}
interface CompiledPermissions {
  levels: CompiledPermissionLevel[];
}

function compileRegexp(permissions) {
  if (permissions.length == 0) return null;
  return new RegExp(permissions.map(x => '^' + _escapeRegExp(x).replace(/\\\*/g, '.*') + '$').join('|'));
}

export function compilePermissions(permissions: string[] | string): CompiledPermissions {
  if (!permissions) return null;

  if (_isString(permissions)) permissions = permissions.split(/,|;|\||\s/);
  else permissions = _flatten(permissions.map(x => x.split(/,|;|\||\s/)));

  permissions = _compact(permissions.map(x => x.trim()));

  let lastType = null;
  let lastItems = [];

  const res: CompiledPermissions = {
    levels: [],
  };

  for (const item of permissions) {
    const type = item.startsWith('~') ? 'deny' : 'allow';
    const perm = item.startsWith('~') ? item.substring(1) : item;

    if (lastType != null && type != lastType) {
      res.levels.push({
        re: compileRegexp(lastItems),
        type: lastType,
      });
      lastItems = [];
    }

    lastItems.push(perm);
    lastType = type;
  }

  if (lastItems.length > 0) {
    res.levels.push({
      re: compileRegexp(lastItems),
      type: lastType,
    });
  }

  return res;
}

export function testPermission(tested: string, permissions: CompiledPermissions) {
  let allow = true;

  if (!permissions) {
    return true;
  }

  for (const level of permissions.levels) {
    if (tested.match(level.re)) {
      if (level.type == 'allow') allow = true;
      if (level.type == 'deny') allow = false;
    }
  }

  return allow;
}

export function testSubPermission(
  tested: string,
  permissions: string[],
  allowSamePermission = true
): true | false | null {
  let result = null;
  for (const permWithSign of permissions) {
    const perm = permWithSign.startsWith('~') ? permWithSign.substring(1) : permWithSign;
    const deny = permWithSign.startsWith('~');

    if (perm.endsWith('*')) {
      const prefix = perm.substring(0, perm.length - 1);
      if (tested.startsWith(prefix)) {
        result = !deny;
      }
    } else {
      if (allowSamePermission && tested == perm) {
        result = !deny;
      }
    }
  }
  return result;
}

export function getPredefinedPermissions(predefinedRoleName: string) {
  switch (predefinedRoleName) {
    case 'superadmin':
      return ['*', '~widgets/*', 'widgets/admin', 'widgets/database', '~all-connections'];
    case 'logged-user':
      return ['*', '~widgets/admin', '~admin/*', '~internal-storage', '~all-connections'];
    case 'anonymous-user':
      return ['*', '~widgets/admin', '~admin/*', '~internal-storage', '~all-connections'];
    default:
      return null;
  }
}

export function sortPermissionsFromTheSameLevel(permissions: string[]) {
  return [...permissions.filter(x => x.startsWith('~')), ...permissions.filter(x => !x.startsWith('~'))];
}
