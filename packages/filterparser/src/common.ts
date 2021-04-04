import P from 'parsimmon';

export const whitespace = P.regexp(/\s*/m);

export function token(parser) {
  return parser.skip(whitespace);
}

export function word(str) {
  return P.string(str).thru(token);
}

export function interpretEscapes(str) {
  let escapes = {
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
  };
  return str.replace(/\\(u[0-9a-fA-F]{4}|[^u])/, (_, escape) => {
    let type = escape.charAt(0);
    let hex = escape.slice(1);
    if (type === 'u') {
      return String.fromCharCode(parseInt(hex, 16));
    }
    if (escapes.hasOwnProperty(type)) {
      return escapes[type];
    }
    return type;
  });
}
