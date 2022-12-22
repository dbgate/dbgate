import _compact from 'lodash/compact';
import _isString from 'lodash/isString';
import _startCase from 'lodash/startCase';

export interface FilterNameDefinition {
  childName: string;
}

// original C# variant
// public bool Match(string value)
// {
//     if (String.IsNullOrEmpty(Filter)) return false;
//     if (String.IsNullOrEmpty(value)) return true;

//     var camelVariants = new HashSet<string>();
//     camelVariants.Add(new String(value.Where(Char.IsUpper).ToArray()));
//     if (value.All(x => Char.IsUpper(x) || x == '_'))
//     {
//         var sb = new StringBuilder();
//         for (int i = 0; i < value.Length; i++)
//         {
//             if (Char.IsUpper(value[i]) && (i == 0 || value[i - 1] == '_')) sb.Append(value[i]);
//         }
//         camelVariants.Add(sb.ToString());
//     }
//     else
//     {
//         string s = value, s0;
//         do
//         {
//             s0 = s;
//             s = Regex.Replace(s, "([A-Z])([A-Z])([A-Z])", "$1$3");
//         } while (s0 != s);
//         camelVariants.Add(new String(s.Where(Char.IsUpper).ToArray()));
//     }

//     bool camelMatch = camelVariants.Any(x => DoMatch(Filter, x));
//     if (Filter.All(Char.IsUpper)) return camelMatch;
//     return DoMatch(Filter, value) || camelMatch;
// }

// function fuzzysearch(needle, haystack) {
//   var hlen = haystack.length;
//   var nlen = needle.length;
//   if (nlen > hlen) {
//     return false;
//   }
//   if (nlen === hlen) {
//     return needle === haystack;
//   }
//   outer: for (var i = 0, j = 0; i < nlen; i++) {
//     var nch = needle.charCodeAt(i);
//     while (j < hlen) {
//       if (haystack.charCodeAt(j++) === nch) {
//         continue outer;
//       }
//     }
//     return false;
//   }
//   return true;
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
