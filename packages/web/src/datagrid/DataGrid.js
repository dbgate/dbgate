import React from 'react';
import styled from 'styled-components';
import DataGridCore from './DataGridCore';
import ColumnManager from './ColumnManager';

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

const DataGridContainer = styled.div`
  position: relative;
  flex-grow: 1;
`;

/** @param props {import('./types').DataGridProps} */
export default function DataGrid(props) {
  return (
    <MainContainer>
      <ColumnManagerContainer>
        <ColumnManager {...props} />
      </ColumnManagerContainer>
      <DataGridContainer>
        <DataGridCore {...props} />
      </DataGridContainer>
    </MainContainer>
  );
}
