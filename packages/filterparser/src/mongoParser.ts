import P from 'parsimmon';
import { interpretEscapes, token, word, whitespace } from './common';

const operatorCondition = operator => value => ({
  __placeholder__: {
    [operator]: value,
  },
});

const regexCondition = regexString => value => ({
  __placeholder__: {
    $regex: regexString.replace('#VALUE#', value),
    $options: 'i',
  },
});

const numberTestCondition = () => value => ({
  $or: [
    {
      __placeholder__: {
        $regex: `.*${value}.*`,
        $options: 'i',
      },
    },
    {
      __placeholder__: value,
    },
  ],
});

const testCondition = (operator, value) => () => ({
  __placeholder__: {
    [operator]: value,
  },
});

const compoudCondition = conditionType => conditions => {
  if (conditions.length == 1) return conditions[0];
  return {
    [conditionType]: conditions,
  };
};

const negateCondition = condition => ({
  __placeholder__: {
    $not: condition.__placeholder__,
  },
});

const createParser = () => {
  const langDef = {
    string1: () =>
      token(P.regexp(/"((?:\\.|.)*?)"/, 1))
        .map(interpretEscapes)
        .desc('string quoted'),

    string2: () =>
      token(P.regexp(/'((?:\\.|.)*?)'/, 1))
        .map(interpretEscapes)
        .desc('string quoted'),

    number: () =>
      token(P.regexp(/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/))
        .map(Number)
        .desc('number'),

    noQuotedString: () => P.regexp(/[^\s^,^'^"]+/).desc('string unquoted'),

    value: r => P.alt(r.string1, r.string2, r.number, r.noQuotedString),
    valueTestNum: r => r.number.map(numberTestCondition()),
    valueTest: r => r.value.map(regexCondition('.*#VALUE#.*')),

    comma: () => word(','),
    not: () => word('NOT'),
    notExists: r => r.not.then(r.exists).map(testCondition('$exists', false)),
    exists: () => word('EXISTS').map(testCondition('$exists', true)),
    true: () => word('TRUE').map(testCondition('$eq', true)),
    false: () => word('FALSE').map(testCondition('$eq', false)),

    eq: r => word('=').then(r.value).map(operatorCondition('$eq')),
    ne: r => word('!=').then(r.value).map(operatorCondition('$ne')),
    lt: r => word('<').then(r.value).map(operatorCondition('$lt')),
    gt: r => word('>').then(r.value).map(operatorCondition('$gt')),
    le: r => word('<=').then(r.value).map(operatorCondition('$lte')),
    ge: r => word('>=').then(r.value).map(operatorCondition('$gte')),
    startsWith: r => word('^').then(r.value).map(regexCondition('#VALUE#.*')),
    endsWith: r => word('$').then(r.value).map(regexCondition('.*#VALUE#')),
    contains: r => word('+').then(r.value).map(regexCondition('.*#VALUE#.*')),
    startsWithNot: r => word('!^').then(r.value).map(regexCondition('#VALUE#.*')).map(negateCondition),
    endsWithNot: r => word('!$').then(r.value).map(regexCondition('.*#VALUE#')).map(negateCondition),
    containsNot: r => word('~').then(r.value).map(regexCondition('.*#VALUE#.*')).map(negateCondition),

    element: r =>
      P.alt(
        r.exists,
        r.notExists,
        r.true,
        r.false,
        r.eq,
        r.ne,
        r.lt,
        r.gt,
        r.le,
        r.ge,
        r.startsWith,
        r.endsWith,
        r.contains,
        r.startsWithNot,
        r.endsWithNot,
        r.containsNot,
        r.valueTestNum,
        r.valueTest
      ).trim(whitespace),
    factor: r => r.element.sepBy(whitespace).map(compoudCondition('$and')),
    list: r => r.factor.sepBy(r.comma).map(compoudCondition('$or')),
  };

  return P.createLanguage(langDef);
};

export const mongoParser = createParser();
