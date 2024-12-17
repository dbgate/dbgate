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

export function filterNameCompoud(
  filter: string,
  namesMain: string[],
  namesChild: string[]
): 'main' | 'child' | 'both' | 'none' {
  if (!filter) return 'both';

  // const camelVariants = [name.replace(/[^A-Z]/g, '')]
  const tokens = filter.split(' ').map(x => x.trim());

  const namesCompactedMain = _compact(namesMain);
  const namesCompactedChild = _compact(namesChild);

  let isMainOnly = true;
  let isChildOnly = true;

  for (const token of tokens) {
    const foundMain = namesCompactedMain.find(name => camelMatch(token, name));
    const foundChild = namesCompactedChild.find(name => camelMatch(token, name));
    if (!foundMain && !foundChild) return 'none';

    if (!foundMain) isMainOnly = false;
    if (!foundChild) isChildOnly = false;
  }

  if (isMainOnly && isChildOnly) return 'both';
  if (isMainOnly) return 'main';
  if (isChildOnly) return 'child';
  return 'none';
}

export function tokenizeBySearchFilter(text: string, filter: string): { text: string; isMatch: boolean }[] {
  const camelTokens = [];
  const stdTokens = [];
  for (const token of filter.split(' ').map(x => x.trim())) {
    if (token.replace(/[A-Z]/g, '').length == 0) {
      camelTokens.push(token);
    } else {
      stdTokens.push(token.toUpperCase());
    }
  }

  let res = [
    {
      text,
      isMatch: false,
    },
  ];

  for (const token of camelTokens) {
    const nextres = [];
    for (const item of res) {
      const indexes = [];
      for (const char of token) {
        if (indexes.length == 0 && char == item.text[0]?.toUpperCase()) {
          // handle first letter of camelcase
          indexes.push(0);
        } else {
          const index = item.text.indexOf(char, indexes.length > 0 ? indexes[indexes.length - 1] + 1 : 0);
          if (index < 0) {
            indexes.push(-1);
          } else {
            indexes.push(index);
          }
        }
      }
      if (indexes.some(x => x < 0)) {
        nextres.push(item);
      } else {
        let lastIndex = 0;
        for (let i = 0; i < indexes.length; i++) {
          if (indexes[i] > lastIndex) {
            nextres.push({ text: item.text.substring(lastIndex, indexes[i]), isMatch: false });
          }
          nextres.push({ text: item.text.substring(indexes[i], indexes[i] + 1), isMatch: true });
          lastIndex = indexes[i] + 1;
        }
        nextres.push({ text: item.text.substring(lastIndex), isMatch: false });
      }
    }
    res = nextres;
  }

  for (const token of stdTokens) {
    const nextres = [];
    for (const item of res) {
      const index = item.text?.toUpperCase().indexOf(token);
      if (index < 0) {
        nextres.push(item);
      } else {
        nextres.push({ text: item.text.substring(0, index), isMatch: false });
        nextres.push({ text: item.text.substring(index, index + token.length), isMatch: true });
        nextres.push({ text: item.text.substring(index + token.length), isMatch: false });
      }
    }
    res = nextres;
  }

  res = res.filter(x => x.text.length > 0);

  if (res.length == 1 && !res[0].isMatch) {
    return null;
  }

  return res;

  // const result = [];
  // let lastMatch = 0;
  // for (const token of tokens) {
  //   const index = text.indexOf(token, lastMatch);
  //   if (index < 0) {
  //     result.push({ token, isMatch: false });
  //     continue;
  //   }

  //   result.push({ token: text.substring(lastMatch, index), isMatch: false });
  //   result.push({ token: text.substring(index, index + token.length), isMatch: true });
  //   lastMatch = index + token.length;
  // }

  // result.push({ token: text.substring(lastMatch), isMatch: false });

  // return result;
}
