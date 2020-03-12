import P from 'parsimmon';
import { FilterType } from './types';

const whitespace = P.regexp(/\s*/m);

function token(parser) {
  return parser.skip(whitespace);
}

function interpretEscapes(str) {
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

const parser = P.createLanguage({
  expr: r => P.alt(r.string),

  string: () =>
    token(P.regexp(/"((?:\\.|.)*?)"/, 1))
      .map(interpretEscapes)
      .desc('string'),
});

export function parseFilter(value: string, filterType: FilterType) {
  const ast = parser.expr.tryParse(value);
  console.log(ast);
  return ast;
}
