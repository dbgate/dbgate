import P from 'parsimmon';
import { FilterType } from './types';

const whitespace = P.regexp(/\s*/m);

function token(parser) {
  return parser.skip(whitespace);
}

function word(str) {
  return P.string(str).thru(token);
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

const binaryCondition = operator => value => ({
  conditionType: 'binary',
  operator,
  left: {
    exprType: 'placeholder',
  },
  right: {
    exprType: 'value',
    value,
  },
});

const compoudCondition = conditionType => conditions => {
  if (conditions.length == 1) return conditions[0];
  return {
    conditionType,
    conditions,
  };
};

const unaryCondition = conditionType => () => {
  return {
    conditionType,
    expr: {
      exprType: 'placeholder',
    },
  };
};

const binaryFixedValueCondition = value => () => {
  return {
    conditionType: 'binary',
    operator: '=',
    left: {
      exprType: 'placeholder',
    },
    right: {
      exprType: 'value',
      value,
    },
  };
};

const parser = P.createLanguage({
  string1: () =>
    token(P.regexp(/"((?:\\.|.)*?)"/, 1))
      .map(interpretEscapes)
      .map(binaryCondition('='))
      .desc('string quoted'),

  string2: () =>
    token(P.regexp(/'((?:\\.|.)*?)'/, 1))
      .map(interpretEscapes)
      .map(binaryCondition('='))
      .desc('string quoted'),

  number: () =>
    token(P.regexp(/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/))
      .map(Number)
      .map(binaryCondition('='))
      .desc('number'),

  noQuotedString: () =>
    P.regexp(/[^\s^,^'^"]+/)
      .desc('string unquoted')
      .map(binaryCondition('=')),

  comma: () => word(','),
  not: () => word('NOT'),
  notNull: r => r.not.then(r.null).map(unaryCondition('isNotNull')),
  null: () => word('NULL').map(unaryCondition('isNull')),
  empty: () => word('EMPTY').map(unaryCondition('isEmpty')),
  notEmpty: r => r.not.then(r.empty).map(unaryCondition('isNotEmpty')),
  true: () => word('TRUE').map(binaryFixedValueCondition(1)),
  false: () => word('FALSE').map(binaryFixedValueCondition(0)),

  element: r =>
    P.alt(
      r.string1,
      r.string2,
      r.null,
      r.notNull,
      r.number,
      r.empty,
      r.notEmpty,
      r.true,
      r.false,
      // must be last
      r.noQuotedString
    ).trim(whitespace),
  factor: r => r.element.sepBy(whitespace).map(compoudCondition('and')),
  list: r => r.factor.sepBy(r.comma).map(compoudCondition('or')),
});

export function parseFilter(value: string, filterType: FilterType) {
  const ast = parser.list.tryParse(value);
  return ast;
}
