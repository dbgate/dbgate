import React from 'react';
import styled from 'styled-components';
import ColumnManager from './ColumnManager';

import ReferenceManager from './ReferenceManager';
import { HorizontalSplitter } from '../widgets/Splitter';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';
import CellDataView from '../celldata/CellDataView';

const LeftContainer = styled.div`
  background-color: white;
  display: flex;
  flex: 1;
`;

const DataGridContainer = styled.div`
  position: relative;
  flex-grow: 1;
`;

export default function DataGrid(props) {
  const { GridCore } = props;
  const [managerSize, setManagerSize] = React.useState(0);
  const [selection, setSelection] = React.useState([]);
  const [grider, setGrider] = React.useState(null);
  return (
    <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
      <LeftContainer>
        <WidgetColumnBar>
          <WidgetColumnBarItem title="Columns" name="columns" height="50%">
            <ColumnManager {...props} managerSize={managerSize} />
          </WidgetColumnBarItem>
          {props.showReferences && (
            <WidgetColumnBarItem title="References" name="references" height="30%">
              <ReferenceManager {...props} managerSize={managerSize} />
            </WidgetColumnBarItem>
          )}
          <WidgetColumnBarItem title="Cell data" name="cellData">
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
