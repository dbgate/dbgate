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
  ManagerOuterContainerFull,
  WidgetTitle,
} from './ManagerStyles';
import ReferenceManager from './ReferenceManager';
import { HorizontalSplitter } from '../widgets/Splitter';
import LoadingDataGrid from './LoadingDataGrid';

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
  flex: 1;
`;

const DataGridContainer = styled.div`
  position: relative;
  flex-grow: 1;
`;

/** @param props {import('./types').LoadingDataGridProps} */
export default function DataGrid(props) {
  const Container1 = props.showReferences ? ManagerOuterContainer1 : ManagerOuterContainerFull;
  const [managerSize, setManagerSize] = React.useState(0);
  return (
    <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
      <LeftContainer>
        <ManagerMainContainer>
          <Container1>
            <ColumnManager {...props} managerSize={managerSize} />
          </Container1>
          {props.showReferences && (
            <ManagerOuterContainer2>
              <ReferenceManager {...props} managerSize={managerSize} />
            </ManagerOuterContainer2>
          )}
        </ManagerMainContainer>
      </LeftContainer>

      <DataGridContainer>
        <LoadingDataGrid {...props} />
      </DataGridContainer>
    </HorizontalSplitter>

    // <MainContainer>
    //   <LeftContainer style={{ width: 300 }}>
    //     <ManagerMainContainer>
    //       <Container1>
    //         <ColumnManager {...props} />
    //       </Container1>
    //       {props.showReferences && (
    //         <ManagerOuterContainer2>
    //           <ReferenceManager {...props} />
    //         </ManagerOuterContainer2>
    //       )}
    //     </ManagerMainContainer>
    //   </LeftContainer>

    //   {/* <ColumnManagerContainer>
    //     <ColumnManager {...props} />
    //   </ColumnManagerContainer> */}
    //   <DataGridContainer>
    //     <DataGridCore {...props} />
    //   </DataGridContainer>
    // </MainContainer>
  );
}
