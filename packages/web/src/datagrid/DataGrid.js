import React from 'react';
import styled from 'styled-components';
import ColumnManager from './ColumnManager';

import ReferenceManager from './ReferenceManager';
import { HorizontalSplitter } from '../widgets/Splitter';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';
import CellDataView from '../celldata/CellDataView';
import { FreeTableGridDisplay } from 'dbgate-datalib';
import useTheme from '../theme/useTheme';

const LeftContainer = styled.div`
  background-color: ${(props) => props.theme.manager_background};
  display: flex;
  flex: 1;
`;

const DataGridContainer = styled.div`
  position: relative;
  flex-grow: 1;
`;

export default function DataGrid(props) {
  const { GridCore, FormView, config, formDisplay } = props;
  const theme = useTheme();
  const [managerSize, setManagerSize] = React.useState(0);
  const [selection, setSelection] = React.useState([]);
  const [formSelection, setFormSelection] = React.useState(null);
  const [grider, setGrider] = React.useState(null);
  const [collapsedWidgets, setCollapsedWidgets] = React.useState([]);
  // const [formViewData, setFormViewData] = React.useState(null);
  const isFormView = !!(config && config.isFormView);

  return (
    <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
      <LeftContainer theme={theme}>
        <WidgetColumnBar onChangeCollapsedWidgets={setCollapsedWidgets}>
          {!isFormView && (
            <WidgetColumnBarItem title="Columns" name="columns" height={props.showReferences ? '40%' : '60%'}>
              <ColumnManager {...props} managerSize={managerSize} />
            </WidgetColumnBarItem>
          )}
          {props.showReferences && props.display.hasReferences && (
            <WidgetColumnBarItem title="References" name="references" height="30%" collapsed={props.isDetailView}>
              <ReferenceManager {...props} managerSize={managerSize} />
            </WidgetColumnBarItem>
          )}
          <WidgetColumnBarItem
            title="Cell data"
            name="cellData"
            // cell data must be collapsed by default, because of performance reasons
            // when not collapsed, onSelectionChanged of grid is set and RERENDER of this component is done on every selection change
            collapsed
          >
            {isFormView ? (
              <CellDataView selectedValue={formSelection} />
            ) : (
              <CellDataView selection={selection} grider={grider} />
            )}
          </WidgetColumnBarItem>
        </WidgetColumnBar>
      </LeftContainer>

      <DataGridContainer>
        {isFormView ? (
          <FormView {...props} onSelectionChanged={collapsedWidgets.includes('cellData') ? null : setFormSelection} />
        ) : (
          <GridCore
            {...props}
            onSelectionChanged={collapsedWidgets.includes('cellData') ? null : setSelection}
            onChangeGrider={setGrider}
            formViewAvailable={!!FormView && !!formDisplay}
          />
        )}
      </DataGridContainer>
    </HorizontalSplitter>
  );
}
