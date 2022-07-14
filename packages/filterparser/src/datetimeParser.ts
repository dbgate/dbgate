import P from 'parsimmon';
import moment from 'moment';
import { FilterType } from './types';
import { Condition } from 'dbgate-sqltree';
import { TransformType } from 'dbgate-types';
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

const createParser = () => {
  const langDef = {
    comma: () => word(','),

    yearNum: () => P.regexp(/\d\d\d\d/).map(yearCondition()),
    yearMonthNum: () => P.regexp(/\d\d\d\d-\d\d?/).map(yearMonthCondition()),
    yearMonthDayNum: () => P.regexp(/\d\d\d\d-\d\d?-\d\d?/).map(yearMonthDayCondition()),
    yearMonthDayMinute: () => P.regexp(/\d\d\d\d-\d\d?-\d\d?\s+\d\d?:\d\d?/).map(yearMonthDayMinuteCondition()),
    yearMonthDaySecond: () =>
      P.regexp(/\d\d\d\d-\d\d?-\d\d?(\s+|T)\d\d?:\d\d?:\d\d?/).map(yearMonthDaySecondCondition()),

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
        r.nextYear
      ).trim(whitespace),
    factor: r => r.element.sepBy(whitespace).map(compoudCondition('$and')),
    list: r => r.factor.sepBy(r.comma).map(compoudCondition('$or')),
  };

  return P.createLanguage(langDef);
};

export const datetimeParser = createParser();
