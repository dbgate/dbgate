import P from 'parsimmon';
import { Condition } from 'dbgate-sqltree';
import { interpretEscapes, token, word, whitespace } from './common';
import { mongoParser } from './mongoParser';
import { datetimeParser } from './datetimeParser';
import { hexStringToArray } from 'dbgate-tools';
import { FilterBehaviour } from 'dbgate-types';

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

const createParser = (filterBehaviour: FilterBehaviour) => {
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

    hexstring: () =>
      token(P.regexp(/0x(([0-9a-fA-F][0-9a-fA-F])+)/, 1))
        .map(x => ({
          type: 'Buffer',
          data: hexStringToArray(x),
        }))
        .desc('hex string'),

    noQuotedString: () => P.regexp(/[^\s^,^'^"]+/).desc('string unquoted'),

    sql: () =>
      token(P.regexp(/\{(.*?)\}/, 1))
        .map(sqlTemplate)
        .desc('sql literal'),

    value: r => P.alt(...allowedValues.map(x => r[x])),
    valueTestEq: r => r.value.map(binaryCondition('=')),
    hexTestEq: r => r.hexstring.map(binaryCondition('=')),
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
  if (filterBehaviour.allowStringToken) {
    allowedValues.push('string1', 'string2', 'noQuotedString');
  }
  if (filterBehaviour.allowNumberToken) {
    allowedValues.push('string1Num', 'string2Num', 'number');
  }

  const allowedElements = [];

  if (filterBehaviour.supportNullTesting) {
    allowedElements.push('null', 'notNull');
  }

  if (filterBehaviour.supportEquals) {
    allowedElements.push('eq', 'ne', 'ne2');
  }

  if (filterBehaviour.supportSqlCondition) {
    allowedElements.push('sql');
  }

  if (filterBehaviour.supportNumberLikeComparison || filterBehaviour.supportDatetimeComparison) {
    allowedElements.push('le', 'ge', 'lt', 'gt');
  }

  if (filterBehaviour.supportEmpty) {
    allowedElements.push('empty', 'notEmpty');
  }

  if (filterBehaviour.allowHexString) {
    allowedElements.push('hexTestEq');
  }

  if (filterBehaviour.supportStringInclusion) {
    allowedElements.push('startsWith', 'endsWith', 'contains', 'startsWithNot', 'endsWithNot', 'containsNot');
  }
  if (filterBehaviour.supportBooleanValues) {
    if (filterBehaviour.allowNumberToken || filterBehaviour.allowStringToken) {
      allowedElements.push('true', 'false');
    } else {
      allowedElements.push('true', 'false', 'trueNum', 'falseNum');
    }
  }

  // must be last
  if (filterBehaviour.allowStringToken) {
    allowedElements.push('valueTestStr');
  } else {
    allowedElements.push('valueTestEq');
  }

  return P.createLanguage(langDef);
};

const cachedFilters: { [key: string]: P.Language } = {};

function getParser(filterBehaviour: FilterBehaviour) {
  if (filterBehaviour.compilerType == 'mongoCondition') {
    return mongoParser;
  }
  if (filterBehaviour.compilerType == 'datetime') {
    return datetimeParser;
  }
  const key = JSON.stringify(filterBehaviour);
  if (!cachedFilters[key]) {
    cachedFilters[key] = createParser(filterBehaviour);
  }
  return cachedFilters[key];
}

export function parseFilter(value: string, filterBehaviour: FilterBehaviour): Condition {
  const parser = getParser(filterBehaviour);
  // console.log('value', value);
  // console.log('filterBehaviour', filterBehaviour);
  const ast = parser.list.tryParse(value);
  // console.log('AST', ast);
  return ast;
}
