import React from 'react';
import styled from 'styled-components';
import ColumnManager from './ColumnManager';

import ReferenceManager from './ReferenceManager';
import { HorizontalSplitter } from '../widgets/Splitter';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';
import CellDataView from '../celldata/CellDataView';
import { FreeTableGridDisplay } from '@dbgate/datalib';
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
  const { GridCore } = props;
  const theme = useTheme();
  const [managerSize, setManagerSize] = React.useState(0);
  const [selection, setSelection] = React.useState([]);
  const [grider, setGrider] = React.useState(null);
  return (
    <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
      <LeftContainer theme={theme}>
        <WidgetColumnBar>
          <WidgetColumnBarItem title="Columns" name="columns" height={props.showReferences ? '40%' : '60%'}>
            <ColumnManager {...props} managerSize={managerSize} />
          </WidgetColumnBarItem>
          {props.showReferences && props.display.hasReferences && (
            <WidgetColumnBarItem title="References" name="references" height="30%" collapsed={props.isDetailView}>
              <ReferenceManager {...props} managerSize={managerSize} />
            </WidgetColumnBarItem>
          )}
          <WidgetColumnBarItem title="Cell data" name="cellData" collapsed={props.isDetailView}>
            <CellDataView selection={selection} grider={grider} />
          </WidgetColumnBarItem>
        </WidgetColumnBar>
      </LeftContainer>

      <DataGridContainer>
        <GridCore {...props} onSelectionChanged={setSelection} onChangeGrider={setGrider} />
      </DataGridContainer>
    </HorizontalSplitter>
  );
}
