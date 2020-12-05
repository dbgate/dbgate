import React from 'react';
import _ from 'lodash';
import Chart from 'react-chartjs-2';
import randomcolor from 'randomcolor';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';
import useDimensions from '../utility/useDimensions';
import { HorizontalSplitter } from '../widgets/Splitter';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';
import { FormSelectField } from '../utility/forms';
import { useForm } from '../utility/FormProvider';
import { saturateByTenth } from '../theme/colorUtil';

const ChartWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`;

// const chartData = {
//   labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
//   datasets: [
//     {
//       label: '# of Votes',
//       data: [12, 19, 3, 5, 2, 3],
//       backgroundColor: [
//         'rgba(255, 99, 132, 0.2)',
//         'rgba(54, 162, 235, 0.2)',
//         'rgba(255, 206, 86, 0.2)',
//         'rgba(75, 192, 192, 0.2)',
//         'rgba(153, 102, 255, 0.2)',
//         'rgba(255, 159, 64, 0.2)',
//       ],
//       borderColor: [
//         'rgba(255, 99, 132, 1)',
//         'rgba(54, 162, 235, 1)',
//         'rgba(255, 206, 86, 1)',
//         'rgba(75, 192, 192, 1)',
//         'rgba(153, 102, 255, 1)',
//         'rgba(255, 159, 64, 1)',
//       ],
//       borderWidth: 1,
//     },
//   ],
// };

function createChartData(freeData, labelColumn, dataColumns, colorSeed, chartType) {
  if (!freeData || !labelColumn || !dataColumns || dataColumns.length == 0) return {};
  const labels = _.uniq(freeData.rows.map((x) => x[labelColumn]));
  const colors = randomcolor({
    count: labels.length,
    seed: colorSeed,
  });
  const res = {
    labels: freeData.rows.map((x) => x[labelColumn]),
    datasets: dataColumns.map((dataColumn) => ({
      label: dataColumn,
      // data: [12, 19, 3, 5, 2, 3],
      data: labels.map((label) =>
        _.sum(freeData.rows.filter((row) => row[labelColumn] == label).map((row) => row[dataColumn]))
      ),
      backgroundColor: chartType != 'line' ? colors : null,
      borderColor: chartType == 'line' ? colors : null,
      // borderColor: colors, // .map(saturateByTenth),
      // backgroundColor: [
      //   'rgba(255, 99, 132, 0.2)',
      //   'rgba(54, 162, 235, 0.2)',
      //   'rgba(255, 206, 86, 0.2)',
      //   'rgba(75, 192, 192, 0.2)',
      //   'rgba(153, 102, 255, 0.2)',
      //   'rgba(255, 159, 64, 0.2)',
      // ],
      // borderColor: [
      //   'rgba(255, 99, 132, 1)',
      //   'rgba(54, 162, 235, 1)',
      //   'rgba(255, 206, 86, 1)',
      //   'rgba(75, 192, 192, 1)',
      //   'rgba(153, 102, 255, 1)',
      //   'rgba(255, 159, 64, 1)',
      // ],
      borderWidth: 1,
    })),
  };

  return res;
}

export default function DataChart({ data }) {
  const [containerRef, { height: containerHeight, width: containerWidth }] = useDimensions();
  const { values } = useForm();

  const { labelColumn } = values;
  const dataColumns = [];
  for (const key in values) {
    if (key.startsWith('dataColumn_') && values[key]) {
      dataColumns.push(key.substring('dataColumn_'.length));
    }
  }

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
