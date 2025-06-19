import _toPairs from 'lodash/toPairs';
import _sumBy from 'lodash/sumBy';
import {
  ChartConstDefaults,
  ChartDateParsed,
  ChartLimits,
  ChartXTransformFunction,
  ProcessedChart,
} from './chartDefinitions';
import { addMinutes, addHours, addDays, addMonths, addYears } from 'date-fns';

export function getChartDebugPrint(chart: ProcessedChart) {
  let res = '';
  res += `Chart: ${chart.definition.chartType} (${chart.definition.xdef.transformFunction})\n`;
  for (const key of chart.bucketKeysOrdered) {
    res += `${key}: ${_toPairs(chart.buckets[key])
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}\n`;
  }
  return res;
}

export function tryParseChartDate(dateInput: any): ChartDateParsed | null {
  if (dateInput instanceof Date) {
    return {
      year: dateInput.getFullYear(),
      month: dateInput.getMonth() + 1,
      day: dateInput.getDate(),
      hour: dateInput.getHours(),
      minute: dateInput.getMinutes(),
      second: dateInput.getSeconds(),
      fraction: undefined, // Date object does not have fraction
    };
  }

  if (typeof dateInput !== 'string') return null;
  const m = dateInput.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})?)?$/
  );
  if (!m) return null;

  const [_notUsed, year, month, day, hour, minute, second, fraction] = m;

  return {
    year: parseInt(year, 10),
    month: parseInt(month, 10),
    day: parseInt(day, 10),
    hour: parseInt(hour, 10) || 0,
    minute: parseInt(minute, 10) || 0,
    second: parseInt(second, 10) || 0,
    fraction: fraction || undefined,
  };
}

function pad2Digits(number) {
  return ('00' + number).slice(-2);
}

export function stringifyChartDate(value: ChartDateParsed, transform: ChartXTransformFunction): string {
  switch (transform) {
    case 'date:year':
      return `${value.year}`;
    case 'date:month':
      return `${value.year}-${pad2Digits(value.month)}`;
    case 'date:day':
      return `${value.year}-${pad2Digits(value.month)}-${pad2Digits(value.day)}`;
    case 'date:hour':
      return `${value.year}-${pad2Digits(value.month)}-${pad2Digits(value.day)} ${pad2Digits(value.hour)}`;
    case 'date:minute':
      return `${value.year}-${pad2Digits(value.month)}-${pad2Digits(value.day)} ${pad2Digits(value.hour)}:${pad2Digits(
        value.minute
      )}`;
    default:
      return '';
  }
}

export function incrementChartDate(value: ChartDateParsed, transform: ChartXTransformFunction): ChartDateParsed {
  const dateRepresentation = new Date(
    value.year,
    (value.month ?? 1) - 1,
    value.day ?? 1,
    value.hour ?? 0,
    value.minute ?? 0
  );
  let newDateRepresentation: Date;
  switch (transform) {
    case 'date:year':
      newDateRepresentation = addYears(dateRepresentation, 1);
      break;
    case 'date:month':
      newDateRepresentation = addMonths(dateRepresentation, 1);
      break;
    case 'date:day':
      newDateRepresentation = addDays(dateRepresentation, 1);
      break;
    case 'date:hour':
      newDateRepresentation = addHours(dateRepresentation, 1);
      break;
    case 'date:minute':
      newDateRepresentation = addMinutes(dateRepresentation, 1);
      break;
  }
  switch (transform) {
    case 'date:year':
      return { year: newDateRepresentation.getFullYear() };
    case 'date:month':
      return {
        year: newDateRepresentation.getFullYear(),
        month: newDateRepresentation.getMonth() + 1,
      };
    case 'date:day':
      return {
        year: newDateRepresentation.getFullYear(),
        month: newDateRepresentation.getMonth() + 1,
        day: newDateRepresentation.getDate(),
      };
    case 'date:hour':
      return {
        year: newDateRepresentation.getFullYear(),
        month: newDateRepresentation.getMonth() + 1,
        day: newDateRepresentation.getDate(),
        hour: newDateRepresentation.getHours(),
      };
    case 'date:minute':
      return {
        year: newDateRepresentation.getFullYear(),
        month: newDateRepresentation.getMonth() + 1,
        day: newDateRepresentation.getDate(),
        hour: newDateRepresentation.getHours(),
        minute: newDateRepresentation.getMinutes(),
      };
  }
}

export function computeChartBucketKey(
  dateParsed: ChartDateParsed,
  chart: ProcessedChart,
  row: any
): [string, ChartDateParsed] {
  switch (chart.definition.xdef.transformFunction) {
    case 'date:year':
      return [dateParsed ? `${dateParsed.year}` : null, { year: dateParsed.year }];
    case 'date:month':
      return [
        dateParsed ? `${dateParsed.year}-${pad2Digits(dateParsed.month)}` : null,
        {
          year: dateParsed.year,
          month: dateParsed.month,
        },
      ];
    case 'date:day':
      return [
        dateParsed ? `${dateParsed.year}-${pad2Digits(dateParsed.month)}-${pad2Digits(dateParsed.day)}` : null,
        {
          year: dateParsed.year,
          month: dateParsed.month,
          day: dateParsed.day,
        },
      ];
    case 'date:hour':
      return [
        dateParsed
          ? `${dateParsed.year}-${pad2Digits(dateParsed.month)}-${pad2Digits(dateParsed.day)} ${pad2Digits(
              dateParsed.hour
            )}`
          : null,
        {
          year: dateParsed.year,
          month: dateParsed.month,
          day: dateParsed.day,
          hour: dateParsed.hour,
        },
      ];
    case 'date:minute':
      return [
        dateParsed
          ? `${dateParsed.year}-${pad2Digits(dateParsed.month)}-${pad2Digits(dateParsed.day)} ${pad2Digits(
              dateParsed.hour
            )}:${pad2Digits(dateParsed.minute)}`
          : null,
        {
          year: dateParsed.year,
          month: dateParsed.month,
          day: dateParsed.day,
          hour: dateParsed.hour,
          minute: dateParsed.minute,
        },
      ];
    case 'identity':
    default:
      return [row[chart.definition.xdef.field], null];
  }
}

export function computeDateBucketDistance(
  begin: ChartDateParsed,
  end: ChartDateParsed,
  transform: ChartXTransformFunction
): number {
  switch (transform) {
    case 'date:year':
      return end.year - begin.year;
    case 'date:month':
      return (end.year - begin.year) * 12 + (end.month - begin.month);
    case 'date:day':
      return (
        (end.year - begin.year) * 365 +
        (end.month - begin.month) * 30 + // rough approximation
        (end.day - begin.day)
      );
    case 'date:hour':
      return (
        (end.year - begin.year) * 365 * 24 +
        (end.month - begin.month) * 30 * 24 + // rough approximation
        (end.day - begin.day) * 24 +
        (end.hour - begin.hour)
      );
    case 'date:minute':
      return (
        (end.year - begin.year) * 365 * 24 * 60 +
        (end.month - begin.month) * 30 * 24 * 60 + // rough approximation
        (end.day - begin.day) * 24 * 60 +
        (end.hour - begin.hour) * 60 +
        (end.minute - begin.minute)
      );
    case 'identity':
    default:
      return NaN;
  }
}

export function compareChartDatesParsed(
  a: ChartDateParsed,
  b: ChartDateParsed,
  transform: ChartXTransformFunction
): number {
  switch (transform) {
    case 'date:year':
      return a.year - b.year;
    case 'date:month':
      return a.year === b.year ? a.month - b.month : a.year - b.year;
    case 'date:day':
      return a.year === b.year && a.month === b.month
        ? a.day - b.day
        : a.year === b.year
        ? a.month - b.month
        : a.year - b.year;
    case 'date:hour':
      return a.year === b.year && a.month === b.month && a.day === b.day
        ? a.hour - b.hour
        : a.year === b.year && a.month === b.month
        ? a.day - b.day
        : a.year === b.year
        ? a.month - b.month
        : a.year - b.year;

    case 'date:minute':
      return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour
        ? a.minute - b.minute
        : a.year === b.year && a.month === b.month && a.day === b.day
        ? a.hour - b.hour
        : a.year === b.year && a.month === b.month
        ? a.day - b.day
        : a.year === b.year
        ? a.month - b.month
        : a.year - b.year;
  }
}

function getParentDateBucketKey(bucketKey: string, transform: ChartXTransformFunction): string | null {
  switch (transform) {
    case 'date:year':
      return null; // no parent for year
    case 'date:month':
      return bucketKey.slice(0, 4);
    case 'date:day':
      return bucketKey.slice(0, 7);
    case 'date:hour':
      return bucketKey.slice(0, 10);
    case 'date:minute':
      return bucketKey.slice(0, 13);
  }
}

function getParentDateBucketTransform(transform: ChartXTransformFunction): ChartXTransformFunction | null {
  switch (transform) {
    case 'date:year':
      return null; // no parent for year
    case 'date:month':
      return 'date:year';
    case 'date:day':
      return 'date:month';
    case 'date:hour':
      return 'date:day';
    case 'date:minute':
      return 'date:hour';
    default:
      return null;
  }
}

function getParentKeyParsed(date: ChartDateParsed, transform: ChartXTransformFunction): ChartDateParsed | null {
  switch (transform) {
    case 'date:year':
      return null; // no parent for year
    case 'date:month':
      return { year: date.year };
    case 'date:day':
      return { year: date.year, month: date.month };
    case 'date:hour':
      return { year: date.year, month: date.month, day: date.day };
    case 'date:minute':
      return { year: date.year, month: date.month, day: date.day, hour: date.hour };
    default:
      return null;
  }
}

function createParentChartAggregation(chart: ProcessedChart): ProcessedChart | null {
  if (chart.isGivenDefinition) {
    // if the chart is created with a given definition, we cannot create a parent aggregation
    return null;
  }
  const parentTransform = getParentDateBucketTransform(chart.definition.xdef.transformFunction);
  if (!parentTransform) {
    return null;
  }

  const res: ProcessedChart = {
    definition: {
      ...chart.definition,
      xdef: {
        ...chart.definition.xdef,
        transformFunction: parentTransform,
      },
    },
    rowsAdded: chart.rowsAdded,
    bucketKeysOrdered: [],
    buckets: {},
    bucketKeyDateParsed: {},
    isGivenDefinition: false,
    invalidXRows: chart.invalidXRows,
    invalidYRows: { ...chart.invalidYRows }, // copy invalid Y rows
    validYRows: { ...chart.validYRows }, // copy valid Y rows
    topDistinctValues: { ...chart.topDistinctValues }, // copy top distinct values
    availableColumns: chart.availableColumns,
  };

  for (const [bucketKey, bucketValues] of Object.entries(chart.buckets)) {
    const parentKey = getParentDateBucketKey(bucketKey, chart.definition.xdef.transformFunction);
    if (!parentKey) {
      // skip if the bucket is already a parent
      continue;
    }
    res.bucketKeyDateParsed[parentKey] = getParentKeyParsed(
      chart.bucketKeyDateParsed[bucketKey],
      chart.definition.xdef.transformFunction
    );
    aggregateChartNumericValuesFromChild(res, parentKey, bucketValues);
  }

  const bucketKeys = Object.keys(res.buckets).sort();
  res.minX = bucketKeys.length > 0 ? bucketKeys[0] : null;
  res.maxX = bucketKeys.length > 0 ? bucketKeys[bucketKeys.length - 1] : null;

  return res;
}

export function autoAggregateCompactTimelineChart(chart: ProcessedChart) {
  while (true) {
    const fromParsed = chart.bucketKeyDateParsed[chart.minX];
    const toParsed = chart.bucketKeyDateParsed[chart.maxX];

    if (!fromParsed || !toParsed) {
      return chart; // cannot fill timeline buckets without valid date range
    }
    const transform = chart.definition.xdef.transformFunction;
    if (!transform.startsWith('date:')) {
      return chart; // cannot aggregate non-date charts
    }
    const dateDistance = computeDateBucketDistance(fromParsed, toParsed, transform);
    if (dateDistance < (chart.definition.xdef.parentAggregateLimit ?? ChartConstDefaults.parentAggregateLimit)) {
      return chart; // no need to aggregate further, the distance is less than the limit
    }

    const parentChart = createParentChartAggregation(chart);
    if (!parentChart) {
      return chart; // cannot create parent aggregation
    }

    chart = parentChart;
  }
}

export function aggregateChartNumericValuesFromSource(
  chart: ProcessedChart,
  bucketKey: string,
  numericColumns: { [key: string]: number },
  row: any
) {
  for (const ydef of chart.definition.ydefs) {
    if (numericColumns[ydef.field] == null) {
      if (row[ydef.field]) {
        chart.invalidYRows[ydef.field] = (chart.invalidYRows[ydef.field] || 0) + 1; // increment invalid row count if the field is not numeric
      }
      continue;
    }
    chart.validYRows[ydef.field] = (chart.validYRows[ydef.field] || 0) + 1; // increment valid row count

    let distinctValues = chart.topDistinctValues[ydef.field];
    if (!distinctValues) {
      distinctValues = new Set();
      chart.topDistinctValues[ydef.field] = distinctValues;
    }
    if (distinctValues.size < ChartLimits.MAX_DISTINCT_VALUES) {
      chart.topDistinctValues[ydef.field].add(numericColumns[ydef.field]);
    }

    switch (ydef.aggregateFunction) {
      case 'sum':
        chart.buckets[bucketKey][ydef.field] =
          (chart.buckets[bucketKey][ydef.field] || 0) + (numericColumns[ydef.field] || 0);
        break;
      case 'first':
        if (chart.buckets[bucketKey][ydef.field] === undefined) {
          chart.buckets[bucketKey][ydef.field] = numericColumns[ydef.field];
        }
        break;
      case 'last':
        chart.buckets[bucketKey][ydef.field] = numericColumns[ydef.field];
        break;
      case 'min':
        if (chart.buckets[bucketKey][ydef.field] === undefined) {
          chart.buckets[bucketKey][ydef.field] = numericColumns[ydef.field];
        } else {
          chart.buckets[bucketKey][ydef.field] = Math.min(
            chart.buckets[bucketKey][ydef.field],
            numericColumns[ydef.field]
          );
        }
        break;
      case 'max':
        if (chart.buckets[bucketKey][ydef.field] === undefined) {
          chart.buckets[bucketKey][ydef.field] = numericColumns[ydef.field];
        } else {
          chart.buckets[bucketKey][ydef.field] = Math.max(
            chart.buckets[bucketKey][ydef.field],
            numericColumns[ydef.field]
          );
        }
        break;
      case 'count':
        chart.buckets[bucketKey][ydef.field] = (chart.buckets[bucketKey][ydef.field] || 0) + 1;
        break;
      case 'avg':
        if (chart.buckets[bucketKey][ydef.field] === undefined) {
          chart.buckets[bucketKey][ydef.field] = [numericColumns[ydef.field], 1]; // [sum, count]
        } else {
          chart.buckets[bucketKey][ydef.field][0] += numericColumns[ydef.field];
          chart.buckets[bucketKey][ydef.field][1] += 1;
        }
        break;
    }
  }
}

export function aggregateChartNumericValuesFromChild(
  chart: ProcessedChart,
  bucketKey: string,
  childBucketValues: { [key: string]: any }
) {
  for (const ydef of chart.definition.ydefs) {
    if (childBucketValues[ydef.field] == undefined) {
      continue; // skip if the field is not present in the child bucket
    }
    if (!chart.buckets[bucketKey]) {
      chart.buckets[bucketKey] = {};
    }
    switch (ydef.aggregateFunction) {
      case 'sum':
      case 'count':
        chart.buckets[bucketKey][ydef.field] =
          (chart.buckets[bucketKey][ydef.field] || 0) + (childBucketValues[ydef.field] || 0);
        break;
      case 'min':
        if (chart.buckets[bucketKey][ydef.field] === undefined) {
          chart.buckets[bucketKey][ydef.field] = childBucketValues[ydef.field];
        } else {
          chart.buckets[bucketKey][ydef.field] = Math.min(
            chart.buckets[bucketKey][ydef.field],
            childBucketValues[ydef.field]
          );
        }
        break;
      case 'max':
        if (chart.buckets[bucketKey][ydef.field] === undefined) {
          chart.buckets[bucketKey][ydef.field] = childBucketValues[ydef.field];
        } else {
          chart.buckets[bucketKey][ydef.field] = Math.max(
            chart.buckets[bucketKey][ydef.field],
            childBucketValues[ydef.field]
          );
        }
        break;
      case 'avg':
        if (chart.buckets[bucketKey][ydef.field] === undefined) {
          chart.buckets[bucketKey][ydef.field] = childBucketValues[ydef.field];
        } else {
          chart.buckets[bucketKey][ydef.field][0] += childBucketValues[ydef.field][0];
          chart.buckets[bucketKey][ydef.field][1] += childBucketValues[ydef.field][1];
        }
        break;
      case 'first':
      case 'last':
        throw new Error(`Cannot aggregate ${ydef.aggregateFunction} for ${ydef.field} in child bucket`);
    }
  }
}

export function fillChartTimelineBuckets(chart: ProcessedChart) {
  const fromParsed = chart.bucketKeyDateParsed[chart.minX];
  const toParsed = chart.bucketKeyDateParsed[chart.maxX];
  if (!fromParsed || !toParsed) {
    return; // cannot fill timeline buckets without valid date range
  }
  const transform = chart.definition.xdef.transformFunction;

  let currentParsed = fromParsed;
  let count = 0;
  while (compareChartDatesParsed(currentParsed, toParsed, transform) <= 0) {
    const bucketKey = stringifyChartDate(currentParsed, transform);
    if (!chart.buckets[bucketKey]) {
      chart.buckets[bucketKey] = {};
      chart.bucketKeyDateParsed[bucketKey] = currentParsed;
    }
    currentParsed = incrementChartDate(currentParsed, transform);
    count++;
    if (count > ChartLimits.CHART_FILL_LIMIT) {
      chart.errorMessage = `Too many buckets to fill in chart, limit is ${ChartLimits.CHART_FILL_LIMIT}`;
      return;
    }
  }
}

export function computeChartBucketCardinality(bucket: { [key: string]: any }): number {
  return _sumBy(Object.keys(bucket), field => bucket[field]);
}
