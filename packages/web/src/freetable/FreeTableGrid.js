import { runMacro } from '@dbgate/datalib';
import React from 'react';
import _ from 'lodash';
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

function extractMacroValuesForMacro(macroValues, macro) {
  if (!macro) return {};
  return {
    ..._.fromPairs((macro.args || []).filter((x) => x.default != null).map((x) => [x.name, x.default])),
    ..._.mapKeys(macroValues, (v, k) => k.replace(/^.*#/, '')),
  };
}

export default function FreeTableGrid(props) {
  const { modelState, dispatchModel } = props;
  const [managerSize, setManagerSize] = React.useState(0);
  const [selectedMacro, setSelectedMacro] = React.useState(null);
  const [macroValues, setMacroValues] = React.useState({});
  const [selectedCells, setSelectedCells] = React.useState([]);
  const handleExecuteMacro = () => {
    const newModel = runMacro(selectedMacro, macroValues, modelState.value, false, selectedCells);
    dispatchModel({ type: 'set', value: newModel });
    setSelectedMacro(null);
  };
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
          <FreeTableGridCore
            {...props}
            macroPreview={selectedMacro}
            macroValues={extractMacroValuesForMacro(macroValues, selectedMacro)}
            onSelectionChanged={setSelectedCells}
            setSelectedMacro={setSelectedMacro}
          />
          {!!selectedMacro && (
            <MacroDetail
              selectedMacro={selectedMacro}
              setSelectedMacro={setSelectedMacro}
              onChangeValues={setMacroValues}
              macroValues={macroValues}
              onExecute={handleExecuteMacro}
            />
          )}
        </VerticalSplitter>
      </DataGridContainer>
    </HorizontalSplitter>
  );
}
