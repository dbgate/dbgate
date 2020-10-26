import React from 'react';
import styled from 'styled-components';

import { ManagerMainContainer, ManagerOuterContainerFull } from '../datagrid/ManagerStyles';
import { HorizontalSplitter } from '../widgets/Splitter';
import FreeTableColumnEditor from './FreeTableColumnEditor';
import FreeTableGridCore from './FreeTableGridCore';

const LeftContainer = styled.div`
  background-color: white;
  display: flex;
  flex: 1;
`;

const DataGridContainer = styled.div`
  position: relative;
  flex-grow: 1;
`;

export default function FreeTableGrid(props) {
  const [managerSize, setManagerSize] = React.useState(0);
  return (
    <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
      <LeftContainer>
        <ManagerMainContainer>
          <ManagerOuterContainerFull>
            <FreeTableColumnEditor {...props} />
          </ManagerOuterContainerFull>
        </ManagerMainContainer>
      </LeftContainer>

      <DataGridContainer>
        <FreeTableGridCore {...props} />
      </DataGridContainer>
    </HorizontalSplitter>
  );
}
