import React from 'react';
import Chart from 'react-chartjs-2';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';
import useDimensions from '../utility/useDimensions';
import { HorizontalSplitter } from '../widgets/Splitter';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';
import { FormCheckboxField, FormSelectField } from '../utility/forms';
import DataChart from './DataChart';
import { FormProviderCore } from '../utility/FormProvider';

const LeftContainer = styled.div`
  background-color: ${(props) => props.theme.manager_background};
  display: flex;
  flex: 1;
`;

export default function ChartEditor({ data, config, setConfig }) {
  const [managerSize, setManagerSize] = React.useState(0);
  const theme = useTheme();
  const availableColumnNames = data ? data.structure.columns.map((x) => x.columnName) : [];

  return (
    <FormProviderCore values={config} setValues={setConfig}>
      <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
        <LeftContainer theme={theme}>
          <WidgetColumnBar>
            <WidgetColumnBarItem title="Style" name="style" height="40%">
              <FormSelectField label="Chart type" name="chartType">
                <option value="bar">Bar</option>
                <option value="line">Line</option>
              </FormSelectField>
            </WidgetColumnBarItem>
            <WidgetColumnBarItem title="Data" name="data">
              <FormSelectField label="Label column" name="labelColumn">
                <option value=""></option>
                {availableColumnNames.map((col) => (
                  <option value={col} key={col}>
                    {col}
                  </option>
                ))}
              </FormSelectField>
              {availableColumnNames.map((col) => (
                <FormCheckboxField label={col} name={`dataColumn_${col}`} key={col} />
              ))}
            </WidgetColumnBarItem>
          </WidgetColumnBar>
        </LeftContainer>

        <DataChart data={data} />
      </HorizontalSplitter>
    </FormProviderCore>
  );
}
