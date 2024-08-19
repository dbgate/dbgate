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

const numberTestCondition = () => value => {
  return {
    conditionType: 'or',
    conditions: [
      {
        conditionType: 'like',
        left: {
          exprType: 'placeholder',
        },
        right: {
          exprType: 'value',
          value: `.*${value}.*`,
        },
      },
      {
        conditionType: 'binary',
        operator: '=',
        left: {
          exprType: 'placeholder',
        },
        right: {
          exprType: 'value',
          value,
        },
      },
    ],
  };
};

const idRegex = /[('"]([0-9a-f]{24})['")]/;

const objectIdTestCondition = () => value => ({
  conditionType: 'binary',
  operator: '=',
  left: {
    exprType: 'placeholder',
  },
  right: {
    exprType: 'value',
    value: { $oid: value.match(idRegex)[1] },
  },
});

const specificPredicateCondition = predicate => () => ({
  conditionType: 'specificPredicate',
  predicate,
  expr: {
    exprType: 'placeholder',
  },
});

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

    objectid: () => token(P.regexp(/ObjectId\(['"]?[0-9a-f]{24}['"]?\)/)).desc('ObjectId'),

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
    valueTestNum: r => r.number.map(numberTestCondition()),
    valueTestObjectId: r => r.objectid.map(objectIdTestCondition()),

    notExists: r => r.not.then(r.exists).map(specificPredicateCondition('notExists')),
    notEmptyArray: r => r.not.then(r.empty).then(r.array).map(specificPredicateCondition('notEmptyArray')),
    emptyArray: r => r.empty.then(r.array).map(specificPredicateCondition('emptyArray')),
    exists: () => word('EXISTS').map(specificPredicateCondition('exists')),

    comma: () => word(','),
    not: () => word('NOT'),
    empty: () => word('EMPTY'),
    array: () => word('ARRAY'),
    notNull: r => r.not.then(r.null).map(unaryCondition('isNotNull')),
    null: () => word('NULL').map(unaryCondition('isNull')),
    isEmpty: r => r.empty.map(unaryCondition('isEmpty')),
    isNotEmpty: r => r.not.then(r.empty).map(unaryCondition('isNotEmpty')),
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

  if (filterBehaviour.supportExistsTesting) {
    allowedElements.push('exists', 'notExists');
  }

  if (filterBehaviour.supportArrayTesting) {
    allowedElements.push('emptyArray', 'notEmptyArray');
  }

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
    allowedElements.push('isEmpty', 'isNotEmpty');
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

  if (filterBehaviour.allowNumberDualTesting) {
    allowedElements.push('valueTestNum');
  }

  if (filterBehaviour.allowObjectIdTesting) {
    allowedElements.push('valueTestObjectId');
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
