import React from 'react';
import styled from 'styled-components';
import ColumnManager from './ColumnManager';

import ReferenceManager from './ReferenceManager';
import { HorizontalSplitter } from '../widgets/Splitter';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';

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
  return (
    <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
      <LeftContainer>
        <WidgetColumnBar>
          <WidgetColumnBarItem title="Columns" name="columns" height="60%">
            <ColumnManager {...props} managerSize={managerSize} />
          </WidgetColumnBarItem>
          {props.showReferences && (
            <WidgetColumnBarItem title="References" name="references">
              <ReferenceManager {...props} managerSize={managerSize} />
            </WidgetColumnBarItem>
          )}
        </WidgetColumnBar>
      </LeftContainer>

      <DataGridContainer>
        <GridCore {...props} />
      </DataGridContainer>
    </HorizontalSplitter>
  );
}
