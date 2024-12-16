import _compact from 'lodash/compact';
import _isString from 'lodash/isString';
import _startCase from 'lodash/startCase';

// export interface FilterNameDefinition {
//   childName: string;
// }

function camelMatch(filter: string, text: string): boolean {
  if (!text) return false;
  if (!filter) return true;

  if (filter.replace(/[A-Z]/g, '').length == 0) {
    const textCapitals = _startCase(text).replace(/[^A-Z]/g, '');
    const pattern = '.*' + filter.split('').join('.*') + '.*';
    const re = new RegExp(pattern);
    return re.test(textCapitals);
  } else {
    return text.toUpperCase().includes(filter.toUpperCase());
  }
}

export function filterName(filter: string, ...names: string[]) {
  if (!filter) return true;

  // const camelVariants = [name.replace(/[^A-Z]/g, '')]
  const tokens = filter.split(' ').map(x => x.trim());

  const namesCompacted = _compact(names);

  for (const token of tokens) {
    const found = namesCompacted.find(name => camelMatch(token, name));
    if (!found) return false;
  }

  return true;
}

export function tokenizeBySearchFilter(text: string, filter: string): { token: string; isMatch: boolean }[] {
  const tokens = filter.split(' ').map(x => x.trim());

  const result = [];
  let lastMatch = 0;
  for (const token of tokens) {
    const index = text.indexOf(token, lastMatch);
    if (index < 0) {
      result.push({ token, isMatch: false });
      continue;
    }

    result.push({ token: text.substring(lastMatch, index), isMatch: false });
    result.push({ token: text.substring(index, index + token.length), isMatch: true });
    lastMatch = index + token.length;
  }

  result.push({ token: text.substring(lastMatch), isMatch: false });

  return result;
}
