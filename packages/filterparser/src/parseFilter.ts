import P from 'parsimmon';
import moment from 'moment';
import { Condition } from 'dbgate-sqltree';
import { interpretEscapes, token, word, whitespace } from './common';
import { hexStringToArray } from 'dbgate-tools';
import { FilterBehaviour, TransformType } from 'dbgate-types';

const binaryCondition =
  (operator, numberDualTesting = false) =>
  value => {
    const numValue = parseFloat(value);
    if (numberDualTesting && !isNaN(numValue)) {
      return {
        conditionType: 'or',
        conditions: [
          {
            conditionType: 'binary',
            operator,
            left: {
              exprType: 'placeholder',
            },
            right: {
              exprType: 'value',
              value,
            },
          },
          {
            conditionType: 'binary',
            operator,
            left: {
              exprType: 'placeholder',
            },
            right: {
              exprType: 'value',
              value: numValue,
            },
          },
        ],
      };
    }

    return {
      conditionType: 'binary',
      operator,
      left: {
        exprType: 'placeholder',
      },
      right: {
        exprType: 'value',
        value,
      },
    };
  };

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

function getTransformCondition(transform: TransformType, value) {
  return {
    conditionType: 'binary',
    operator: '=',
    left: {
      exprType: 'transform',
      transform,
      expr: {
        exprType: 'placeholder',
      },
    },
    right: {
      exprType: 'value',
      value,
    },
  };
}

const yearCondition = () => value => {
  return getTransformCondition('YEAR', value);
};

const yearMonthCondition = () => value => {
  const m = value.match(/(\d\d\d\d)-(\d\d?)/);

  return {
    conditionType: 'and',
    conditions: [getTransformCondition('YEAR', m[1]), getTransformCondition('MONTH', m[2])],
  };
};

const yearMonthDayCondition = () => value => {
  const m = value.match(/(\d\d\d\d)-(\d\d?)-(\d\d?)/);

  return {
    conditionType: 'and',
    conditions: [
      getTransformCondition('YEAR', m[1]),
      getTransformCondition('MONTH', m[2]),
      getTransformCondition('DAY', m[3]),
    ],
  };
};

const yearEdge = edgeFunction => value => {
  return moment(new Date(parseInt(value), 0, 1))
    [edgeFunction]('year')
    .format('YYYY-MM-DDTHH:mm:ss.SSS');
};

const yearMonthEdge = edgeFunction => value => {
  const m = value.match(/(\d\d\d\d)-(\d\d?)/);

  return moment(new Date(parseInt(m[1]), parseInt(m[2]) - 1, 1))
    [edgeFunction]('month')
    .format('YYYY-MM-DDTHH:mm:ss.SSS');
};

const yearMonthDayEdge = edgeFunction => value => {
  const m = value.match(/(\d\d\d\d)-(\d\d?)-(\d\d?)/);

  return moment(new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])))
    [edgeFunction]('day')
    .format('YYYY-MM-DDTHH:mm:ss.SSS');
};

const yearMonthDayMinuteEdge = edgeFunction => value => {
  const m = value.match(/(\d\d\d\d)-(\d\d?)-(\d\d?)\s+(\d\d?):(\d\d?)/);
  const year = m[1];
  const month = m[2];
  const day = m[3];
  const hour = m[4];
  const minute = m[5];
  const dateObject = new Date(year, month - 1, day, hour, minute);

  return moment(dateObject)[edgeFunction]('minute').format('YYYY-MM-DDTHH:mm:ss.SSS');
};

const yearMonthDayMinuteSecondEdge = edgeFunction => value => {
  const m = value.match(/(\d\d\d\d)-(\d\d?)-(\d\d?)(T|\s+)(\d\d?):(\d\d?):(\d\d?)/);
  const year = m[1];
  const month = m[2];
  const day = m[3];
  const hour = m[5];
  const minute = m[6];
  const second = m[7];
  const dateObject = new Date(year, month - 1, day, hour, minute, second);

  return moment(dateObject)[edgeFunction]('second').format('YYYY-MM-DDTHH:mm:ss.SSS');
};

const createIntervalCondition = (start, end) => {
  return {
    conditionType: 'and',
    conditions: [
      {
        conditionType: 'binary',
        operator: '>=',
        left: {
          exprType: 'placeholder',
        },
        right: {
          exprType: 'value',
          value: start,
        },
      },
      {
        conditionType: 'binary',
        operator: '<=',
        left: {
          exprType: 'placeholder',
        },
        right: {
          exprType: 'value',
          value: end,
        },
      },
    ],
  };
};

const createDateIntervalCondition = (start, end) => {
  return createIntervalCondition(start.format('YYYY-MM-DDTHH:mm:ss.SSS'), end.format('YYYY-MM-DDTHH:mm:ss.SSS'));
};

const fixedMomentIntervalCondition = (intervalType, diff) => () => {
  return createDateIntervalCondition(
    moment().add(intervalType, diff).startOf(intervalType),
    moment().add(intervalType, diff).endOf(intervalType)
  );
};

const yearMonthDayMinuteCondition = () => value => {
  const m = value.match(/(\d\d\d\d)-(\d\d?)-(\d\d?)\s+(\d\d?):(\d\d?)/);
  const year = m[1];
  const month = m[2];
  const day = m[3];
  const hour = m[4];
  const minute = m[5];
  const dateObject = new Date(year, month - 1, day, hour, minute);

  return createDateIntervalCondition(moment(dateObject).startOf('minute'), moment(dateObject).endOf('minute'));
};

const yearMonthDaySecondCondition = () => value => {
  const m = value.match(/(\d\d\d\d)-(\d\d?)-(\d\d?)(T|\s+)(\d\d?):(\d\d?):(\d\d?)/);
  const year = m[1];
  const month = m[2];
  const day = m[3];
  const hour = m[5];
  const minute = m[6];
  const second = m[7];
  const dateObject = new Date(year, month - 1, day, hour, minute, second);

  return createDateIntervalCondition(moment(dateObject).startOf('second'), moment(dateObject).endOf('second'));
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

    this: () => word('THIS'),
    last: () => word('LAST'),
    next: () => word('NEXT'),
    week: () => word('WEEK'),
    month: () => word('MONTH'),
    year: () => word('YEAR'),

    yesterday: () => word('YESTERDAY').map(fixedMomentIntervalCondition('day', -1)),
    today: () => word('TODAY').map(fixedMomentIntervalCondition('day', 0)),
    tomorrow: () => word('TOMORROW').map(fixedMomentIntervalCondition('day', 1)),

    lastWeek: r => r.last.then(r.week).map(fixedMomentIntervalCondition('week', -1)),
    thisWeek: r => r.this.then(r.week).map(fixedMomentIntervalCondition('week', 0)),
    nextWeek: r => r.next.then(r.week).map(fixedMomentIntervalCondition('week', 1)),

    lastMonth: r => r.last.then(r.month).map(fixedMomentIntervalCondition('month', -1)),
    thisMonth: r => r.this.then(r.month).map(fixedMomentIntervalCondition('month', 0)),
    nextMonth: r => r.next.then(r.month).map(fixedMomentIntervalCondition('month', 1)),

    lastYear: r => r.last.then(r.year).map(fixedMomentIntervalCondition('year', -1)),
    thisYear: r => r.this.then(r.year).map(fixedMomentIntervalCondition('year', 0)),
    nextYear: r => r.next.then(r.year).map(fixedMomentIntervalCondition('year', 1)),

    dateValueStart: r =>
      P.alt(
        r.yearMonthDayMinuteSecondStart,
        r.yearMonthDayMinuteStart,
        r.yearMonthDayStart,
        r.yearMonthStart,
        r.yearNumStart
      ),
    dateValueEnd: r =>
      P.alt(r.yearMonthDayMinuteSecondEnd, r.yearMonthDayMinuteEnd, r.yearMonthDayEnd, r.yearMonthEnd, r.yearNumEnd),

    dateLe: r => word('<=').then(r.dateValueEnd).map(binaryCondition('<=')),
    dateGe: r => word('>=').then(r.dateValueStart).map(binaryCondition('>=')),
    dateLt: r => word('<').then(r.dateValueStart).map(binaryCondition('<')),
    dateGt: r => word('>').then(r.dateValueEnd).map(binaryCondition('>')),

    yearNum: () => P.regexp(/\d\d\d\d/).map(yearCondition()),
    yearMonthNum: () => P.regexp(/\d\d\d\d-\d\d?/).map(yearMonthCondition()),
    yearMonthDayNum: () => P.regexp(/\d\d\d\d-\d\d?-\d\d?/).map(yearMonthDayCondition()),
    yearMonthDayMinute: () => P.regexp(/\d\d\d\d-\d\d?-\d\d?\s+\d\d?:\d\d?/).map(yearMonthDayMinuteCondition()),
    yearMonthDaySecond: () =>
      P.regexp(/\d\d\d\d-\d\d?-\d\d?(\s+|T)\d\d?:\d\d?:\d\d?/).map(yearMonthDaySecondCondition()),

    yearNumStart: () => P.regexp(/\d\d\d\d/).map(yearEdge('startOf')),
    yearNumEnd: () => P.regexp(/\d\d\d\d/).map(yearEdge('endOf')),
    yearMonthStart: () => P.regexp(/\d\d\d\d-\d\d?/).map(yearMonthEdge('startOf')),
    yearMonthEnd: () => P.regexp(/\d\d\d\d-\d\d?/).map(yearMonthEdge('endOf')),
    yearMonthDayStart: () => P.regexp(/\d\d\d\d-\d\d?-\d\d?/).map(yearMonthDayEdge('startOf')),
    yearMonthDayEnd: () => P.regexp(/\d\d\d\d-\d\d?-\d\d?/).map(yearMonthDayEdge('endOf')),
    yearMonthDayMinuteStart: () =>
      P.regexp(/\d\d\d\d-\d\d?-\d\d?\s+\d\d?:\d\d?/).map(yearMonthDayMinuteEdge('startOf')),
    yearMonthDayMinuteEnd: () => P.regexp(/\d\d\d\d-\d\d?-\d\d?\s+\d\d?:\d\d?/).map(yearMonthDayMinuteEdge('endOf')),
    yearMonthDayMinuteSecondStart: () =>
      P.regexp(/\d\d\d\d-\d\d?-\d\d?(\s+|T)\d\d?:\d\d?:\d\d?/).map(yearMonthDayMinuteSecondEdge('startOf')),
    yearMonthDayMinuteSecondEnd: () =>
      P.regexp(/\d\d\d\d-\d\d?-\d\d?(\s+|T)\d\d?:\d\d?:\d\d?/).map(yearMonthDayMinuteSecondEdge('endOf')),

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

    eq: r => word('=').then(r.value).map(binaryCondition('=', filterBehaviour.allowNumberDualTesting)),
    ne: r => word('!=').then(r.value).map(binaryCondition('<>', filterBehaviour.allowNumberDualTesting)),
    ne2: r => word('<>').then(r.value).map(binaryCondition('<>', filterBehaviour.allowNumberDualTesting)),
    le: r => word('<=').then(r.value).map(binaryCondition('<=', filterBehaviour.allowNumberDualTesting)),
    ge: r => word('>=').then(r.value).map(binaryCondition('>=', filterBehaviour.allowNumberDualTesting)),
    lt: r => word('<').then(r.value).map(binaryCondition('<', filterBehaviour.allowNumberDualTesting)),
    gt: r => word('>').then(r.value).map(binaryCondition('>', filterBehaviour.allowNumberDualTesting)),
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

  if (filterBehaviour.supportDatetimeComparison) {
    allowedElements.push('yearMonthDaySecond', 'yearMonthDayMinute', 'yearMonthDayNum', 'yearMonthNum', 'yearNum');
  }

  if (filterBehaviour.supportDatetimeSymbols) {
    allowedElements.push(
      'today',
      'yesterday',
      'tomorrow',
      'lastWeek',
      'thisWeek',
      'nextWeek',
      'lastMonth',
      'thisMonth',
      'nextMonth',
      'lastYear',
      'thisYear',
      'nextYear'
    );
  }

  if (filterBehaviour.supportDatetimeComparison) {
    allowedElements.push('dateLe', 'dateGe', 'dateLt', 'dateGt');
  }

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
