import React from 'react';
import _ from 'lodash';
import Chart from 'react-chartjs-2';
import randomcolor from 'randomcolor';
import styled from 'styled-components';
import useDimensions from '../utility/useDimensions';
import { useForm } from '../utility/FormProvider';
import useTheme from '../theme/useTheme';
import moment from 'moment';

const ChartWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`;

function getTimeAxis(labels) {
  const res = [];
  for (const label of labels) {
    const parsed = moment(label);
    if (!parsed.isValid()) return null;
    const iso = parsed.toISOString();
    if (iso < '1850-01-01T00:00:00' || iso > '2150-01-01T00:00:00') return null;
    res.push(parsed);
  }
  return res;
}

function getLabels(labelValues, timeAxis, chartType) {
  if (!timeAxis) return labelValues;
  if (chartType === 'line') return timeAxis.map((x) => x.toDate());
  return timeAxis.map((x) => x.format('D. M. YYYY'));
}

function getOptions(timeAxis, chartType) {
  if (timeAxis && chartType === 'line') {
    return {
      scales: {
        xAxes: [
          {
            type: 'time',
            distribution: 'linear',

            time: {
              tooltipFormat: 'D. M. YYYY HH:mm',
              displayFormats: {
                millisecond: 'HH:mm:ss.SSS',
                second: 'HH:mm:ss',
                minute: 'HH:mm',
                hour: 'D.M hA',
                day: 'D. M.',
                week: 'D. M. YYYY',
                month: 'MM-YYYY',
                quarter: '[Q]Q - YYYY',
                year: 'YYYY',
              },
            },
          },
        ],
      },
    };
  }
  return {};
}

function createChartData(freeData, labelColumn, dataColumns, colorSeed, chartType, dataColumnColors, theme) {
  if (!freeData || !labelColumn || !dataColumns || dataColumns.length == 0) return [{}, {}];
  const colors = randomcolor({
    count: _.max([freeData.rows.length, dataColumns.length, 1]),
    seed: colorSeed,
  });
  let backgroundColor = null;
  let borderColor = null;
  const labelValues = freeData.rows.map((x) => x[labelColumn]);
  const timeAxis = getTimeAxis(labelValues);
  const labels = getLabels(labelValues, timeAxis, chartType);
  const res = {
    labels,
    datasets: dataColumns.map((dataColumn, columnIndex) => {
      if (chartType == 'line' || chartType == 'bar') {
        const color = dataColumnColors[dataColumn];
        if (color) {
          backgroundColor = theme.main_palettes[color][4] + '80';
          borderColor = theme.main_palettes[color][7];
        } else {
          backgroundColor = colors[columnIndex] + '80';
          borderColor = colors[columnIndex];
        }
      } else {
        backgroundColor = colors;
      }

      return {
        label: dataColumn,
        data: freeData.rows.map((row) => row[dataColumn]),
        backgroundColor,
        borderColor,
        borderWidth: 1,
      };
    }),
  };

  const options = getOptions(timeAxis, chartType);
  return [res, options];
}

export function extractDataColumns(values) {
  const dataColumns = [];
  for (const key in values) {
    if (key.startsWith('dataColumn_') && values[key]) {
      dataColumns.push(key.substring('dataColumn_'.length));
    }
  }
  return dataColumns;
}
export function extractDataColumnColors(values, dataColumns) {
  const res = {};
  for (const column of dataColumns) {
    const color = values[`dataColumnColor_${column}`];
    if (color) res[column] = color;
  }
  return res;
}

export default function DataChart({ data }) {
  const [containerRef, { height: containerHeight, width: containerWidth }] = useDimensions();
  const { values } = useForm();
  const theme = useTheme();

  const { labelColumn } = values;
  const dataColumns = extractDataColumns(values);
  const dataColumnColors = extractDataColumnColors(values, dataColumns);
  const [chartData, options] = createChartData(
    data,
    labelColumn,
    dataColumns,
    values.colorSeed || '5',
    values.chartType,
    dataColumnColors,
    theme
  );

  return (
    <ChartWrapper ref={containerRef}>
      <Chart
        key={`${values.chartType}|${containerWidth}|${containerHeight}`}
        width={containerWidth}
        height={containerHeight}
        data={chartData}
        type={values.chartType}
        options={{
          ...options,
          // elements: {
          //   point: {
          //     radius: 0,
          //   },
          // },
          // tooltips: {
          //   mode: 'index',
          //   intersect: false,
          // },
        }}
      />
    </ChartWrapper>
  );
}
