import P from 'parsimmon';
import moment from 'moment';
import { FilterType } from './types';
import { Condition } from 'dbgate-sqltree';
import { TransformType } from 'dbgate-types';
import { interpretEscapes, token, word, whitespace } from './common';
import { mongoParser } from './mongoParser';

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

    yearNum: () => P.regexp(/\d\d\d\d/).map(yearCondition()),
    yearMonthNum: () => P.regexp(/\d\d\d\d-\d\d?/).map(yearMonthCondition()),
    yearMonthDayNum: () => P.regexp(/\d\d\d\d-\d\d?-\d\d?/).map(yearMonthDayCondition()),
    yearMonthDayMinute: () => P.regexp(/\d\d\d\d-\d\d?-\d\d?\s+\d\d?:\d\d?/).map(yearMonthDayMinuteCondition()),
    yearMonthDaySecond: () =>
      P.regexp(/\d\d\d\d-\d\d?-\d\d?(\s+|T)\d\d?:\d\d?:\d\d?/).map(yearMonthDaySecondCondition()),

    value: r => P.alt(...allowedValues.map(x => r[x])),
    valueTestEq: r => r.value.map(binaryCondition('=')),
    valueTestStr: r => r.value.map(likeCondition('like', '%#VALUE#%')),

    comma: () => word(','),
    not: () => word('NOT'),
    notNull: r => r.not.then(r.null).map(unaryCondition('isNotNull')),
    null: () => word('NULL').map(unaryCondition('isNull')),
    empty: () => word('EMPTY').map(unaryCondition('isEmpty')),
    notEmpty: r => r.not.then(r.empty).map(unaryCondition('isNotEmpty')),
    true: () => word('TRUE').map(binaryFixedValueCondition(1)),
    false: () => word('FALSE').map(binaryFixedValueCondition(0)),
    trueNum: () => word('1').map(binaryFixedValueCondition(1)),
    falseNum: () => word('0').map(binaryFixedValueCondition(0)),

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

    eq: r => word('=').then(r.value).map(binaryCondition('=')),
    ne: r => word('!=').then(r.value).map(binaryCondition('<>')),
    lt: r => word('<').then(r.value).map(binaryCondition('<')),
    gt: r => word('>').then(r.value).map(binaryCondition('>')),
    le: r => word('<=').then(r.value).map(binaryCondition('<=')),
    ge: r => word('>=').then(r.value).map(binaryCondition('>=')),
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
  if (filterType == 'string') allowedValues.push('string1', 'string2', 'noQuotedString');
  if (filterType == 'number') allowedValues.push('string1Num', 'string2Num', 'number');

  const allowedElements = ['null', 'notNull', 'eq', 'ne'];
  if (filterType == 'number' || filterType == 'datetime') allowedElements.push('lt', 'gt', 'le', 'ge');
  if (filterType == 'string')
    allowedElements.push(
      'empty',
      'notEmpty',
      'startsWith',
      'endsWith',
      'contains',
      'startsWithNot',
      'endsWithNot',
      'containsNot'
    );
  if (filterType == 'logical') allowedElements.push('true', 'false', 'trueNum', 'falseNum');
  if (filterType == 'datetime')
    allowedElements.push(
      'yearMonthDaySecond',
      'yearMonthDayMinute',
      'yearMonthDayNum',
      'yearMonthNum',
      'yearNum',
      'yesterday',
      'today',
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

  // must be last
  if (filterType == 'string') allowedElements.push('valueTestStr');
  else allowedElements.push('valueTestEq');

  return P.createLanguage(langDef);
};

const parsers = {
  number: createParser('number'),
  string: createParser('string'),
  datetime: createParser('datetime'),
  logical: createParser('logical'),
  mongo: mongoParser,
};

export function parseFilter(value: string, filterType: FilterType): Condition {
  // console.log('PARSING', value, 'WITH', filterType);
  const ast = parsers[filterType].list.tryParse(value);
  // console.log('AST', ast);
  return ast;
}
