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
