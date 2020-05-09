import React from 'react';
import styled from 'styled-components';
import DataGridCore from './DataGridCore';
import ColumnManager from './ColumnManager';

import {
  // SearchBoxWrapper,
  // WidgetsInnerContainer,
  // Input,
  ManagerMainContainer,
  ManagerOuterContainer1,
  ManagerOuterContainer2,
  WidgetTitle,
} from './ManagerStyles';
import ReferenceManager from './ReferenceManager';

const MainContainer = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
`;

const ColumnManagerContainer = styled.div`
  background-color: white;
  overflow-y: scroll;
`;

const LeftContainer = styled.div`
  background-color: white;
  display: flex;
`;

const DataGridContainer = styled.div`
  position: relative;
  flex-grow: 1;
`;

/** @param props {import('./types').DataGridProps} */
export default function DataGrid(props) {
  return (
    <MainContainer>
      <LeftContainer>
        <ManagerMainContainer>
          <ManagerOuterContainer1>
            <WidgetTitle>Columns</WidgetTitle>
            <ColumnManager {...props} />
          </ManagerOuterContainer1>
          <ManagerOuterContainer2>
            <WidgetTitle>References</WidgetTitle>
            <ReferenceManager {...props} />
          </ManagerOuterContainer2>
        </ManagerMainContainer>
      </LeftContainer>

      {/* <ColumnManagerContainer>
        <ColumnManager {...props} />
      </ColumnManagerContainer> */}
      <DataGridContainer>
        <DataGridCore {...props} />
      </DataGridContainer>
    </MainContainer>
  );
}
