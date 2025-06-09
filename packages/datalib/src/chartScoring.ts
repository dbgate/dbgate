import _sortBy from 'lodash/sortBy';
import _sum from 'lodash/sum';
import { ChartLimits, ChartYFieldDefinition, ProcessedChart } from './chartDefinitions';

export function getChartScore(chart: ProcessedChart): number {
  let res = 0;
  res += chart.rowsAdded * 5;

  const ydefScores = chart.definition.ydefs.map(yField => getChartYFieldScore(chart, yField));
  const sorted = _sortBy(ydefScores).reverse();
  res += _sum(sorted.slice(0, ChartLimits.AUTODETECT_MEASURES_LIMIT));
  return res;
}

export function getChartYFieldScore(chart: ProcessedChart, yField: ChartYFieldDefinition): number {
  let res = 0;
  res += chart.validYRows[yField.field] * 5; // score for valid Y rows
  res += (chart.topDistinctValues[yField.field]?.size ?? 0) * 20; // score for distinct values in Y field
  res += chart.rowsAdded * 2; // base score for rows added
  res -= (chart.invalidYRows[yField.field] ?? 0) * 50; // penalty for invalid Y rows

  return res;
}
