import _compact from 'lodash/compact';
import _isString from 'lodash/isString';
import _startCase from 'lodash/startCase';

export interface FilterNameDefinition {
  childName: string;
}

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

export function filterName(filter: string, ...names: (string | FilterNameDefinition)[]) {
  if (!filter) return true;

  // const camelVariants = [name.replace(/[^A-Z]/g, '')]
  const tokens = filter.split(' ').map(x => x.trim());

  const namesCompacted = _compact(names);

  // @ts-ignore
  const namesOwn: string[] = namesCompacted.filter(x => _isString(x));
  // @ts-ignore
  const namesChild: string[] = namesCompacted.filter(x => x.childName).map(x => x.childName);

  for (const token of tokens) {
    // const tokenUpper = token.toUpperCase();
    if (token.startsWith('#')) {
      // const tokenUpperSub = tokenUpper.substring(1);
      const found = namesChild.find(name => camelMatch(token.substring(1), name));
      if (!found) return false;
    } else {
      const found = namesOwn.find(name => camelMatch(token, name));
      if (!found) return false;
    }
  }

  return true;
}
