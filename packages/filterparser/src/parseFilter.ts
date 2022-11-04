import P from 'parsimmon';
import moment from 'moment';
import { FilterType } from './types';
import { Condition } from 'dbgate-sqltree';
import { interpretEscapes, token, word, whitespace } from './common';
import { mongoParser } from './mongoParser';
import { datetimeParser } from './datetimeParser';

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

const likeCondition = (conditionType, likeString) => value => ({
  conditionType,
  left: {
    exprType: 'placeholder',
  },
  right: {
    exprType: 'value',
    value: likeString.replace('#VALUE#', value),
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

const negateCondition = condition => {
  return {
    conditionType: 'not',
    condition,
  };
};

const sqlTemplate = templateSql => {
  return {
    conditionType: 'rawTemplate',
    templateSql,
    expr: {
      exprType: 'placeholder',
    },
  };
};

const createParser = (filterType: FilterType) => {
  const langDef = {
    string1: () =>
      token(P.regexp(/"((?:\\.|.)*?)"/, 1))
        .map(interpretEscapes)
        .desc('string quoted'),

    string2: () =>
      token(P.regexp(/'((?:\\.|.)*?)'/, 1))
        .map(interpretEscapes)
        .desc('string quoted'),

    string1Num: () =>
      token(P.regexp(/"-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?"/, 1))
        .map(Number)
        .desc('numer quoted'),

    string2Num: () =>
      token(P.regexp(/'-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?'/, 1))
        .map(Number)
        .desc('numer quoted'),

    number: () =>
      token(P.regexp(/-?(0|[1-9][0-9]*)([.][0-9]+)?([eE][+-]?[0-9]+)?/))
        .map(Number)
        .desc('number'),

    noQuotedString: () => P.regexp(/[^\s^,^'^"]+/).desc('string unquoted'),

    sql: () =>
      token(P.regexp(/\{(.*?)\}/, 1))
        .map(sqlTemplate)
        .desc('sql literal'),

    value: r => P.alt(...allowedValues.map(x => r[x])),
    valueTestEq: r => r.value.map(binaryCondition('=')),
    valueTestStr: r => r.value.map(likeCondition('like', '%#VALUE#%')),

    comma: () => word(','),
    not: () => word('NOT'),
    notNull: r => r.not.then(r.null).map(unaryCondition('isNotNull')),
    null: () => word('NULL').map(unaryCondition('isNull')),
    empty: () => word('EMPTY').map(unaryCondition('isEmpty')),
    notEmpty: r => r.not.then(r.empty).map(unaryCondition('isNotEmpty')),
    true: () => P.regexp(/true/i).map(binaryFixedValueCondition('1')),
    false: () => P.regexp(/false/i).map(binaryFixedValueCondition('0')),
    trueNum: () => word('1').map(binaryFixedValueCondition('1')),
    falseNum: () => word('0').map(binaryFixedValueCondition('0')),

    eq: r => word('=').then(r.value).map(binaryCondition('=')),
    ne: r => word('!=').then(r.value).map(binaryCondition('<>')),
    ne2: r => word('<>').then(r.value).map(binaryCondition('<>')),
    le: r => word('<=').then(r.value).map(binaryCondition('<=')),
    ge: r => word('>=').then(r.value).map(binaryCondition('>=')),
    lt: r => word('<').then(r.value).map(binaryCondition('<')),
    gt: r => word('>').then(r.value).map(binaryCondition('>')),
    startsWith: r => word('^').then(r.value).map(likeCondition('like', '#VALUE#%')),
    endsWith: r => word('$').then(r.value).map(likeCondition('like', '%#VALUE#')),
    contains: r => word('+').then(r.value).map(likeCondition('like', '%#VALUE#%')),
    startsWithNot: r => word('!^').then(r.value).map(likeCondition('like', '#VALUE#%')).map(negateCondition),
    endsWithNot: r => word('!$').then(r.value).map(likeCondition('like', '%#VALUE#')).map(negateCondition),
    containsNot: r => word('~').then(r.value).map(likeCondition('like', '%#VALUE#%')).map(negateCondition),

    element: r => P.alt(...allowedElements.map(x => r[x])).trim(whitespace),
    factor: r => r.element.sepBy(whitespace).map(compoudCondition('and')),
    list: r => r.factor.sepBy(r.comma).map(compoudCondition('or')),
  };

  const allowedValues = []; // 'string1', 'string2', 'number', 'noQuotedString'];
  if (filterType == 'string' || filterType == 'eval') {
    allowedValues.push('string1', 'string2', 'noQuotedString');
  }
  if (filterType == 'number') {
    allowedValues.push('string1Num', 'string2Num', 'number');
  }

  const allowedElements = ['null', 'notNull', 'eq', 'ne', 'ne2', 'sql'];
  if (filterType == 'number' || filterType == 'datetime' || filterType == 'eval') {
    allowedElements.push('le', 'ge', 'lt', 'gt');
  }
  if (filterType == 'string') {
    allowedElements.push('empty', 'notEmpty');
  }
  if (filterType == 'eval' || filterType == 'string') {
    allowedElements.push('startsWith', 'endsWith', 'contains', 'startsWithNot', 'endsWithNot', 'containsNot');
  }
  if (filterType == 'logical') {
    allowedElements.push('true', 'false', 'trueNum', 'falseNum');
  }
  if (filterType == 'eval') {
    allowedElements.push('true', 'false');
  }

  // must be last
  if (filterType == 'string' || filterType == 'eval') {
    allowedElements.push('valueTestStr');
  } else {
    allowedElements.push('valueTestEq');
  }

  return P.createLanguage(langDef);
};

const parsers = {
  number: createParser('number'),
  string: createParser('string'),
  logical: createParser('logical'),
  eval: createParser('eval'),
  mongo: mongoParser,
  datetime: datetimeParser,
};

export function parseFilter(value: string, filterType: FilterType): Condition {
  // console.log('PARSING', value, 'WITH', filterType);
  const ast = parsers[filterType].list.tryParse(value);
  // console.log('AST', ast);
  return ast;
}
