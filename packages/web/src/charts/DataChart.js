import React from 'react';
import Chart from 'react-chartjs-2';
import randomcolor from 'randomcolor';
import styled from 'styled-components';
import useDimensions from '../utility/useDimensions';
import { useForm } from '../utility/FormProvider';

const ChartWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`;

function createChartData(freeData, labelColumn, dataColumns, colorSeed, chartType) {
  if (!freeData || !labelColumn || !dataColumns || dataColumns.length == 0) return {};
  const colors = randomcolor({
    count: freeData.rows.length,
    seed: colorSeed,
  });
  const res = {
    labels: freeData.rows.map((x) => x[labelColumn]),
    datasets: dataColumns.map((dataColumn) => ({
      label: dataColumn,
      data: freeData.rows.map((row) => row[dataColumn]),
      backgroundColor: chartType != 'line' ? colors : null,
      borderColor: chartType == 'line' ? colors : null,
      borderWidth: 1,
    })),
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

export default function DataChart({ data }) {
  const [containerRef, { height: containerHeight, width: containerWidth }] = useDimensions();
  const { values } = useForm();

  const { labelColumn } = values;
  const dataColumns = extractDataColumns(values);

  return (
    <ChartWrapper ref={containerRef}>
      <Chart
        key={`${values.chartType}|${containerWidth}|${containerHeight}`}
        width={containerWidth}
        height={containerHeight}
        data={createChartData(data, labelColumn, dataColumns, values.colorSeed || 1, values.chartType)}
        type={values.chartType}
      />
    </ChartWrapper>
  );
}
