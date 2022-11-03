import P from 'parsimmon';
import moment from 'moment';
import { FilterType } from './types';
import { Condition } from 'dbgate-sqltree';
import type { TransformType } from 'dbgate-types';
import { interpretEscapes, token, word, whitespace } from './common';

const compoudCondition = conditionType => conditions => {
  if (conditions.length == 1) return conditions[0];
  return {
    [conditionType]: conditions,
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

const unaryCondition = conditionType => () => {
  return {
    conditionType,
    expr: {
      exprType: 'placeholder',
    },
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

const createParser = () => {
  const langDef = {
    comma: () => word(','),

    not: () => word('NOT'),
    notNull: r => r.not.then(r.null).map(unaryCondition('isNotNull')),
    null: () => word('NULL').map(unaryCondition('isNull')),

    sql: () =>
      token(P.regexp(/\{(.*?)\}/, 1))
        .map(sqlTemplate)
        .desc('sql literal'),

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

    valueStart: r =>
      P.alt(
        r.yearMonthDayMinuteSecondStart,
        r.yearMonthDayMinuteStart,
        r.yearMonthDayStart,
        r.yearMonthStart,
        r.yearNumStart
      ),
    valueEnd: r =>
      P.alt(r.yearMonthDayMinuteSecondEnd, r.yearMonthDayMinuteEnd, r.yearMonthDayEnd, r.yearMonthEnd, r.yearNumEnd),

    le: r => word('<=').then(r.valueEnd).map(binaryCondition('<=')),
    ge: r => word('>=').then(r.valueStart).map(binaryCondition('>=')),
    lt: r => word('<').then(r.valueStart).map(binaryCondition('<')),
    gt: r => word('>').then(r.valueEnd).map(binaryCondition('>')),

    element: r =>
      P.alt(
        r.yearMonthDaySecond,
        r.yearMonthDayMinute,
        r.yearMonthDayNum,
        r.yearMonthNum,
        r.yearNum,
        r.yesterday,
        r.today,
        r.tomorrow,
        r.lastWeek,
        r.thisWeek,
        r.nextWeek,
        r.lastMonth,
        r.thisMonth,
        r.nextMonth,
        r.lastYear,
        r.thisYear,
        r.nextYear,
        r.null,
        r.notNull,
        r.le,
        r.lt,
        r.ge,
        r.gt,
        r.sql
      ).trim(whitespace),
    factor: r => r.element.sepBy(whitespace).map(compoudCondition('$and')),
    list: r => r.factor.sepBy(r.comma).map(compoudCondition('$or')),
  };

  return P.createLanguage(langDef);
};

export const datetimeParser = createParser();
