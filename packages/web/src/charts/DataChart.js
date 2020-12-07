import React from 'react';
import _ from 'lodash';
import Chart from 'react-chartjs-2';
import randomcolor from 'randomcolor';
import styled from 'styled-components';
import useDimensions from '../utility/useDimensions';
import { useForm } from '../utility/FormProvider';
import { saturateByTenth } from '../theme/colorUtil';
import useTheme from '../theme/useTheme';

const ChartWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`;

function createChartData(freeData, labelColumn, dataColumns, colorSeed, chartType, dataColumnColors, theme) {
  if (!freeData || !labelColumn || !dataColumns || dataColumns.length == 0) return {};
  const colors = randomcolor({
    count: _.max([freeData.rows.length, dataColumns.length, 1]),
    seed: colorSeed,
  });
  let backgroundColor = null;
  let borderColor = null;
  const res = {
    labels: freeData.rows.map((x) => x[labelColumn]),
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

  return res;
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

  return (
    <ChartWrapper ref={containerRef}>
      <Chart
        key={`${values.chartType}|${containerWidth}|${containerHeight}`}
        width={containerWidth}
        height={containerHeight}
        data={createChartData(
          data,
          labelColumn,
          dataColumns,
          values.colorSeed || '5',
          values.chartType,
          dataColumnColors,
          theme
        )}
        type={values.chartType}
      />
    </ChartWrapper>
  );
}
