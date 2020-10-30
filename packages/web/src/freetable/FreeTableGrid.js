import React from 'react';
import styled from 'styled-components';

import { ManagerMainContainer, ManagerOuterContainer_60, ManagerOuterContainer_40 } from '../datagrid/ManagerStyles';
import { HorizontalSplitter, VerticalSplitter } from '../widgets/Splitter';
import FreeTableColumnEditor from './FreeTableColumnEditor';
import FreeTableGridCore from './FreeTableGridCore';
import MacroDetail from './MacroDetail';
import MacroManager from './MacroManager';

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
  const [selectedMacro, setSelectedMacro] = React.useState(null);
  const [macroValues, setMacroValues] = React.useState({});
  return (
    <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
      <LeftContainer>
        <ManagerMainContainer>
          <ManagerOuterContainer_40>
            <FreeTableColumnEditor {...props} />
          </ManagerOuterContainer_40>
          <ManagerOuterContainer_60>
            <MacroManager
              {...props}
              managerSize={managerSize}
              selectedMacro={selectedMacro}
              setSelectedMacro={setSelectedMacro}
            />
          </ManagerOuterContainer_60>
        </ManagerMainContainer>
      </LeftContainer>

      <DataGridContainer>
        <VerticalSplitter initialValue="70%">
          <FreeTableGridCore {...props} macroPreview={selectedMacro} macroValues={macroValues} />
          {!!selectedMacro && (
            <MacroDetail
              selectedMacro={selectedMacro}
              setSelectedMacro={setSelectedMacro}
              onChangeValues={setMacroValues}
              macroValues={macroValues}
            />
          )}
        </VerticalSplitter>
      </DataGridContainer>
    </HorizontalSplitter>
  );
}
