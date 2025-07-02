import {
  ChartAvailableColumn,
  ChartDateParsed,
  ChartDefinition,
  ChartLimits,
  ProcessedChart,
} from './chartDefinitions';
import _sortBy from 'lodash/sortBy';
import _sum from 'lodash/sum';
import {
  aggregateChartNumericValuesFromSource,
  autoAggregateCompactTimelineChart,
  computeChartBucketCardinality,
  computeChartBucketKey,
  fillChartTimelineBuckets,
  runTransformFunction,
  tryParseChartDate,
} from './chartTools';
import { getChartScore, getChartYFieldScore } from './chartScoring';

export class ChartProcessor {
  chartsProcessing: ProcessedChart[] = [];
  charts: ProcessedChart[] = [];
  availableColumnsDict: { [field: string]: ChartAvailableColumn } = {};
  availableColumns: ChartAvailableColumn[] = [];
  autoDetectCharts = false;
  rowsAdded = 0;
  errorMessage?: string;

  constructor(public givenDefinitions: ChartDefinition[] = []) {
    for (const definition of givenDefinitions) {
      this.chartsProcessing.push({
        definition,
        rowsAdded: 0,
        bucketKeysOrdered: [],
        buckets: {},
        bucketKeyDateParsed: {},
        isGivenDefinition: true,
        invalidXRows: 0,
        invalidYRows: {},
        availableColumns: [],
        validYRows: {},
        topDistinctValues: {},
        groups: [],
        groupSet: new Set<string>(),
        bucketKeysSet: new Set<string>(),
      });
    }
    this.autoDetectCharts = this.givenDefinitions.length == 0;
  }

  // findOrCreateChart(definition: ChartDefinition, isGivenDefinition: boolean): ProcessedChart {
  //   const signatureItems = [
  //     definition.chartType,
  //     definition.xdef.field,
  //     definition.xdef.transformFunction,
  //     definition.ydefs.map(y => y.field).join(','),
  //   ];
  //   const signature = signatureItems.join('::');

  //   if (this.chartsBySignature[signature]) {
  //     return this.chartsBySignature[signature];
  //   }
  //   const chart: ProcessedChart = {
  //     definition,
  //     rowsAdded: 0,
  //     bucketKeysOrdered: [],
  //     buckets: {},
  //     bucketKeyDateParsed: {},
  //     isGivenDefinition,
  //   };
  //   this.chartsBySignature[signature] = chart;
  //   return chart;
  // }

  addRow(row: any) {
    const dateColumns: { [key: string]: ChartDateParsed } = {};
    const numericColumns: { [key: string]: number } = {};
    const numericColumnsForAutodetect: { [key: string]: number } = {};
    const stringColumns: { [key: string]: string } = {};

    for (const [key, value] of Object.entries(row)) {
      const number: number = typeof value == 'string' ? Number(value) : typeof value == 'number' ? value : NaN;
      let availableColumn = this.availableColumnsDict[key];
      if (!availableColumn) {
        availableColumn = {
          field: key,
          dataType: 'none',
        };
        this.availableColumnsDict[key] = availableColumn;
      }

      const keyLower = key.toLowerCase();
      const keyIsId = keyLower.endsWith('_id') || keyLower == 'id' || key.endsWith('Id');

      const parsedDate = tryParseChartDate(value);
      if (parsedDate) {
        dateColumns[key] = parsedDate;
        if (availableColumn.dataType == 'none') {
          availableColumn.dataType = 'date';
        }
        if (availableColumn.dataType != 'date') {
          availableColumn.dataType = 'mixed';
        }
        continue;
      }

      if (!isNaN(number) && isFinite(number)) {
        numericColumns[key] = number;
        if (!keyIsId) {
          numericColumnsForAutodetect[key] = number; // for auto-detecting charts
        }
        if (availableColumn.dataType == 'none') {
          availableColumn.dataType = 'number';
        }
        if (availableColumn.dataType != 'number') {
          availableColumn.dataType = 'mixed';
        }
        continue;
      }

      if (typeof value === 'string' && isNaN(number) && value.length < 100) {
        stringColumns[key] = value;
        if (availableColumn.dataType == 'none') {
          availableColumn.dataType = 'string';
        }
        if (availableColumn.dataType != 'string') {
          availableColumn.dataType = 'mixed';
        }
      }
    }

    // const sortedNumericColumnns = Object.keys(numericColumns).sort();

    if (this.autoDetectCharts) {
      // create charts from data, if there are no given definitions
      for (const datecol in dateColumns) {
        let usedChart = this.chartsProcessing.find(
          chart =>
            !chart.isGivenDefinition &&
            chart.definition.xdef.field === datecol &&
            chart.definition.xdef.transformFunction?.startsWith('date:')
        );

        if (
          !usedChart &&
          (this.rowsAdded < ChartLimits.APPLY_LIMIT_AFTER_ROWS ||
            this.chartsProcessing.length < ChartLimits.AUTODETECT_CHART_LIMIT)
        ) {
          usedChart = {
            definition: {
              chartType: 'timeline',
              xdef: {
                field: datecol,
                transformFunction: 'date:day',
              },
              ydefs: [],
            },
            rowsAdded: 0,
            bucketKeysOrdered: [],
            buckets: {},
            groups: [],
            bucketKeyDateParsed: {},
            isGivenDefinition: false,
            invalidXRows: 0,
            invalidYRows: {},
            availableColumns: [],
            validYRows: {},
            topDistinctValues: {},
            groupSet: new Set<string>(),
            bucketKeysSet: new Set<string>(),
          };
          this.chartsProcessing.push(usedChart);
        }

        for (const [key, value] of Object.entries(row)) {
          if (value == null) continue;
          if (key == datecol) continue; // skip date column itself
          let existingYDef = usedChart.definition.ydefs.find(y => y.field === key);
          if (
            !existingYDef &&
            (this.rowsAdded < ChartLimits.APPLY_LIMIT_AFTER_ROWS ||
              usedChart.definition.ydefs.length < ChartLimits.AUTODETECT_MEASURES_LIMIT)
          ) {
            existingYDef = {
              field: key,
              aggregateFunction: 'sum',
            };
            usedChart.definition.ydefs.push(existingYDef);
          }
        }
      }
    }

    // apply on all charts with this date column
    for (const chart of this.chartsProcessing) {
      if (chart.errorMessage) {
        continue; // skip charts with errors
      }

      this.applyRawData(
        chart,
        row,
        dateColumns[chart.definition.xdef.field],
        chart.isGivenDefinition ? numericColumns : numericColumnsForAutodetect,
        stringColumns
      );

      if (Object.keys(chart.buckets).length > ChartLimits.CHART_FILL_LIMIT) {
        chart.errorMessage = `Chart has too many buckets, limit is ${ChartLimits.CHART_FILL_LIMIT}.`;
      }
    }

    for (let i = 0; i < this.chartsProcessing.length; i++) {
      if (this.chartsProcessing[i].errorMessage) {
        continue; // skip charts with errors
      }
      if (this.chartsProcessing[i].definition.chartType != 'timeline') {
        continue; // skip non-timeline charts
      }
      this.chartsProcessing[i] = autoAggregateCompactTimelineChart(this.chartsProcessing[i]);
    }

    this.rowsAdded += 1;
    if (this.rowsAdded == ChartLimits.APPLY_LIMIT_AFTER_ROWS) {
      this.applyLimitsOnCharts();
    }
  }

  applyLimitsOnCharts() {
    const autodetectProcessingCharts = this.chartsProcessing.filter(chart => !chart.isGivenDefinition);
    if (autodetectProcessingCharts.length > ChartLimits.AUTODETECT_CHART_LIMIT) {
      const newAutodetectProcessingCharts = _sortBy(
        this.chartsProcessing.slice(0, ChartLimits.AUTODETECT_CHART_LIMIT),
        chart => -getChartScore(chart)
      );

      for (const chart of autodetectProcessingCharts) {
        chart.definition.ydefs = _sortBy(chart.definition.ydefs, yfield => -getChartYFieldScore(chart, yfield)).slice(
          0,
          ChartLimits.AUTODETECT_MEASURES_LIMIT
        );
      }

      this.chartsProcessing = [
        ...this.chartsProcessing.filter(chart => chart.isGivenDefinition),
        ...newAutodetectProcessingCharts,
      ];
    }
  }

  addRows(...rows: any[]) {
    for (const row of rows) {
      this.addRow(row);
    }
  }

  finalize() {
    this.applyLimitsOnCharts();
    this.availableColumns = Object.values(this.availableColumnsDict);
    for (const chart of this.chartsProcessing) {
      if (chart.errorMessage) {
        this.charts.push(chart);
        continue;
      }
      let addedChart: ProcessedChart = chart;
      if (chart.rowsAdded == 0 && !chart.isGivenDefinition) {
        continue; // skip empty charts
      }
      const sortOrder = chart.definition.xdef.sortOrder ?? 'ascKeys';
      if (sortOrder != 'natural') {
        if (sortOrder == 'ascKeys' || sortOrder == 'descKeys') {
          if (chart.definition.chartType == 'timeline' && chart.definition.xdef.transformFunction.startsWith('date:')) {
            addedChart = autoAggregateCompactTimelineChart(addedChart);
            fillChartTimelineBuckets(addedChart);
          }

          if (addedChart.errorMessage) {
            this.charts.push(addedChart);
            continue;
          }
          ('');
          addedChart.bucketKeysOrdered = _sortBy([...addedChart.bucketKeysSet]);
          if (sortOrder == 'descKeys') {
            addedChart.bucketKeysOrdered.reverse();
          }
        }

        if (sortOrder == 'ascValues' || sortOrder == 'descValues') {
          addedChart.bucketKeysOrdered = _sortBy([...addedChart.bucketKeysSet], key =>
            computeChartBucketCardinality(addedChart.buckets[key])
          );
          if (sortOrder == 'descValues') {
            addedChart.bucketKeysOrdered.reverse();
          }
        }
      }

      if (!addedChart.isGivenDefinition) {
        addedChart = {
          ...addedChart,
          definition: {
            ...addedChart.definition,
            ydefs: addedChart.definition.ydefs.filter(
              y =>
                !addedChart.invalidYRows[y.field] &&
                addedChart.validYRows[y.field] / addedChart.rowsAdded >= ChartLimits.VALID_VALUE_RATIO_LIMIT
            ),
          },
        };
      }

      if (
        addedChart.definition.trimXCountLimit != null &&
        addedChart.bucketKeysOrdered.length > addedChart.definition.trimXCountLimit
      ) {
        addedChart.bucketKeysOrdered = addedChart.bucketKeysOrdered.slice(0, addedChart.definition.trimXCountLimit);
      }

      if (addedChart) {
        addedChart.availableColumns = this.availableColumns;
        this.charts.push(addedChart);
      }

      this.groupPieOtherBuckets(addedChart);

      addedChart.groups = [...addedChart.groupSet];
      addedChart.bucketKeysSet = undefined;
      addedChart.groupSet = undefined;
    }

    this.charts = [
      ...this.charts.filter(x => x.isGivenDefinition),
      ..._sortBy(
        this.charts.filter(x => !x.isGivenDefinition),
        chart => -getChartScore(chart)
      ),
    ];
  }
  groupPieOtherBuckets(chart: ProcessedChart) {
    if (chart.definition.chartType !== 'pie') {
      return; // only for pie charts
    }
    const ratioLimit = chart.definition.pieRatioLimit ?? ChartLimits.PIE_RATIO_LIMIT;
    const countLimit = chart.definition.pieCountLimit ?? ChartLimits.PIE_COUNT_LIMIT;
    if (ratioLimit == 0 && countLimit == 0) {
      return; // no grouping if limit is 0
    }
    const otherBucket: any = {};
    let newBuckets: any = {};
    const cardSum = _sum(Object.values(chart.buckets).map(bucket => computeChartBucketCardinality(bucket)));

    if (cardSum == 0) {
      return; // no buckets to process
    }

    for (const [bucketKey, bucket] of Object.entries(chart.buckets)) {
      if (computeChartBucketCardinality(bucket) / cardSum < ratioLimit) {
        for (const field in bucket) {
          otherBucket[field] = (otherBucket[field] ?? 0) + bucket[field];
        }
      } else {
        newBuckets[bucketKey] = bucket;
      }
    }

    if (Object.keys(newBuckets).length > countLimit) {
      const sortedBucketKeys = _sortBy(
        Object.entries(newBuckets),
        ([, bucket]) => -computeChartBucketCardinality(bucket)
      ).map(([key]) => key);
      const newBuckets2 = {};
      sortedBucketKeys.forEach((key, index) => {
        if (index < countLimit) {
          newBuckets2[key] = newBuckets[key];
        } else {
          for (const field in newBuckets[key]) {
            otherBucket[field] = (otherBucket[field] ?? 0) + newBuckets[key][field];
          }
        }
      });
      newBuckets = newBuckets2;
    }

    if (Object.keys(otherBucket).length > 0) {
      newBuckets['Other'] = otherBucket;
    }
    chart.buckets = newBuckets;
    chart.bucketKeysOrdered = [...chart.bucketKeysOrdered, 'Other'].filter(key => key in newBuckets);
  }

  applyRawData(
    chart: ProcessedChart,
    row: any,
    dateParsed: ChartDateParsed,
    numericColumns: { [key: string]: number },
    stringColumns: { [key: string]: string }
  ) {
    if (chart.definition.xdef == null) {
      return;
    }

    if (row[chart.definition.xdef.field] == null) {
      return;
    }

    if (dateParsed == null && chart.definition.xdef.transformFunction.startsWith('date:')) {
      chart.invalidXRows += 1;
      return; // skip if date is invalid
    }

    const [bucketKey, bucketKeyParsed] = computeChartBucketKey(dateParsed, chart, row);
    const bucketGroup = chart.definition.groupingField
      ? runTransformFunction(row[chart.definition.groupingField], chart.definition.groupTransformFunction)
      : null;
    if (bucketGroup) {
      chart.groupSet.add(bucketGroup);
    }
    if (chart.groupSet.size > ChartLimits.CHART_GROUP_LIMIT) {
      chart.errorMessage = `Chart has too many groups, limit is ${ChartLimits.CHART_GROUP_LIMIT}.`;
    }

    if (!bucketKey) {
      return; // skip if no bucket key
    }

    if (bucketKeyParsed) {
      chart.bucketKeyDateParsed[bucketKey] = bucketKeyParsed;
    }

    if (chart.minX == null || bucketKey < chart.minX) {
      chart.minX = bucketKey;
    }
    if (chart.maxX == null || bucketKey > chart.maxX) {
      chart.maxX = bucketKey;
    }

    const groupedBucketKey = chart.definition.groupingField ? `${bucketGroup ?? ''}::${bucketKey}` : bucketKey;
    if (!chart.buckets[groupedBucketKey]) {
      chart.buckets[groupedBucketKey] = {};
    }

    if (!chart.bucketKeysSet.has(bucketKey)) {
      chart.bucketKeysSet.add(bucketKey);
      if (chart.definition.xdef.sortOrder == 'natural') {
        chart.bucketKeysOrdered.push(bucketKey);
      }
    }

    aggregateChartNumericValuesFromSource(chart, groupedBucketKey, numericColumns, row);
    chart.rowsAdded += 1;
  }
}
