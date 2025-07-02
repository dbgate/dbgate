export type ChartTypeEnum = 'bar' | 'line' | 'timeline' | 'pie' | 'polarArea';
export type ChartXTransformFunction =
  | 'identity'
  | 'date:minute'
  | 'date:hour'
  | 'date:day'
  | 'date:month'
  | 'date:year';
export type ChartYAggregateFunction = 'sum' | 'first' | 'last' | 'min' | 'max' | 'count' | 'avg';
export type ChartDataLabelFormatter = 'number' | 'size:bytes' | 'size:kb' | 'size:mb' | 'size:gb';

export const ChartConstDefaults = {
  sortOrder: ' asc',
  windowAlign: 'end',
  windowSize: 100,
  parentAggregateLimit: 200,
};

export const ChartLimits = {
  AUTODETECT_CHART_LIMIT: 10, // limit for auto-detecting charts, to avoid too many charts (after APPLY_LIMIT_AFTER_ROWS rows)
  AUTODETECT_CHART_TOTAL_LIMIT: 32, // limit for auto-detecting charts, to avoid too many charts (for first APPLY_LIMIT_AFTER_ROWS rows)
  AUTODETECT_MEASURES_LIMIT: 10, // limit for auto-detecting measures, to avoid too many measures
  APPLY_LIMIT_AFTER_ROWS: 100,
  MAX_DISTINCT_VALUES: 10, // max number of distinct values to keep in topDistinctValues
  VALID_VALUE_RATIO_LIMIT: 0.5, // limit for valid value ratio, y defs below this will not be used in auto-detect
  PIE_RATIO_LIMIT: 0.05, // limit for other values in pie chart, if the value is below this, it will be grouped into "Other"
  PIE_COUNT_LIMIT: 10, // limit for number of pie chart slices, if the number of slices is above this, it will be grouped into "Other"
  CHART_FILL_LIMIT: 10000, // limit for filled charts (time intervals), to avoid too many points
  CHART_GROUP_LIMIT: 32, // limit for number of groups in a chart
};

export interface ChartXFieldDefinition {
  field: string;
  title?: string;
  transformFunction: ChartXTransformFunction;
  sortOrder?: 'natural' | 'ascKeys' | 'descKeys' | 'ascValues' | 'descValues';
  windowAlign?: 'start' | 'end';
  windowSize?: number;
  parentAggregateLimit?: number;
}

export interface ChartYFieldDefinition {
  field: string;
  title?: string;
  aggregateFunction: ChartYAggregateFunction;
}

export interface ChartDefinition {
  chartType: ChartTypeEnum;
  title?: string;
  pieRatioLimit?: number; // limit for pie chart, if the value is below this, it will be grouped into "Other"
  pieCountLimit?: number; // limit for number of pie chart slices, if the number of slices is above this, it will be grouped into "Other"
  trimXCountLimit?: number; // limit for number of x values, if the number of x values is above this, it will be trimmed

  xdef: ChartXFieldDefinition;
  ydefs: ChartYFieldDefinition[];
  groupingField?: string;
  groupTransformFunction?: ChartXTransformFunction;

  useDataLabels?: boolean;
  dataLabelFormatter?: ChartDataLabelFormatter;
}

export interface ChartDateParsed {
  year: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  fraction?: string;
}

export interface ChartAvailableColumn {
  field: string;
  dataType: 'none' | 'string' | 'number' | 'date' | 'mixed';
}

export interface ProcessedChart {
  minX?: string;
  maxX?: string;
  rowsAdded: number;
  buckets: { [key: string]: any }; // key is the bucket key, value is aggregated data
  bucketKeysOrdered: string[];
  bucketKeysSet: Set<string>;
  bucketKeyDateParsed: { [key: string]: ChartDateParsed }; // key is the bucket key (without group::), value is parsed date
  isGivenDefinition: boolean; // true if the chart was created with a given definition, false if it was created from raw data
  invalidXRows: number;
  invalidYRows: { [key: string]: number }; // key is the y field, value is the count of invalid rows
  validYRows: { [key: string]: number }; // key is the field, value is the count of valid rows
  groups: string[];
  groupSet: Set<string>;

  topDistinctValues: { [key: string]: Set<any> }; // key is the field, value is the set of distinct values
  availableColumns: ChartAvailableColumn[];
  errorMessage?: string; // error message if there was an error processing the chart

  definition: ChartDefinition;
}
