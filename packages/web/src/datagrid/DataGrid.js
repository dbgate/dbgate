import React from 'react';
import styled from 'styled-components';
import ColumnManager from './ColumnManager';

import ReferenceManager from './ReferenceManager';
import { HorizontalSplitter } from '../widgets/Splitter';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';

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
