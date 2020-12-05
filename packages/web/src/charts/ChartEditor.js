import React from 'react';
import Chart from 'react-chartjs-2';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';
import useDimensions from '../utility/useDimensions';
import { HorizontalSplitter } from '../widgets/Splitter';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';
import { FormCheckboxField, FormSelectField, FormTextField } from '../utility/forms';
import DataChart from './DataChart';
import { FormProviderCore } from '../utility/FormProvider';
import { loadChartData, loadChartStructure } from './chartDataLoader';
import useExtensions from '../utility/useExtensions';
import { getConnectionInfo } from '../utility/metadataLoaders';
import { findEngineDriver } from 'dbgate-tools';

const LeftContainer = styled.div`
  background-color: ${(props) => props.theme.manager_background};
  display: flex;
  flex: 1;
`;

export default function ChartEditor({ data, config, setConfig, sql, conid, database }) {
  const [managerSize, setManagerSize] = React.useState(0);
  const theme = useTheme();
  const extensions = useExtensions();

  const [availableColumnNames, setAvailableColumnNames] = React.useState([]);
  const [loadedData, setLoadedData] = React.useState(null);

  const getDriver = async () => {
    const conn = await getConnectionInfo({ conid });
    if (!conn) return;
    const driver = findEngineDriver(conn, extensions);
    return driver;
  };

  const handleLoadColumns = async () => {
    const driver = await getDriver();
    if (!driver) return;
    const columns = await loadChartStructure(driver, conid, database, sql);
    setAvailableColumnNames(columns);
  };

  const handleLoadData = async () => {
    const driver = await getDriver();
    if (!driver) return;
    const loaded = await loadChartData(driver, conid, database, sql, config);
    if (!loaded) return;
    const { columns, rows } = loaded;
    setLoadedData({
      structure: columns,
      rows,
    });
  };

  React.useEffect(() => {
    if (sql && conid && database) {
      handleLoadColumns();
    }
  }, [sql, conid, database, extensions]);

  React.useEffect(() => {
    if (data) {
      setAvailableColumnNames(data ? data.structure.columns.map((x) => x.columnName) : []);
    }
  }, [data]);

  React.useEffect(() => {
    if (config.labelColumn && sql && conid && database) {
      handleLoadData();
    }
  }, [config, sql, conid, database]);

  return (
    <FormProviderCore values={config} setValues={setConfig}>
      <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
        <LeftContainer theme={theme}>
          <WidgetColumnBar>
            <WidgetColumnBarItem title="Style" name="style" height="40%">
              <FormSelectField label="Chart type" name="chartType">
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                {/* <option value="radar">Radar</option> */}
                <option value="pie">Pie</option>
                <option value="polarArea">Polar area</option>
                {/* <option value="bubble">Bubble</option>
                <option value="scatter">Scatter</option> */}
              </FormSelectField>
              <FormTextField label="Color seed" name="colorSeed" />
            </WidgetColumnBarItem>
            <WidgetColumnBarItem title="Data" name="data">
              {availableColumnNames.length > 0 && (
                <FormSelectField label="Label column" name="labelColumn">
                  <option value=""></option>
                  {availableColumnNames.map((col) => (
                    <option value={col} key={col}>
                      {col}
                    </option>
                  ))}
                </FormSelectField>
              )}
              {availableColumnNames.map((col) => (
                <FormCheckboxField label={col} name={`dataColumn_${col}`} key={col} />
              ))}
            </WidgetColumnBarItem>
          </WidgetColumnBar>
        </LeftContainer>

        <DataChart data={data || loadedData} />
      </HorizontalSplitter>
    </FormProviderCore>
  );
}
