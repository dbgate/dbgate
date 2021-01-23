import { runMacro } from 'dbgate-datalib';
import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';

import { HorizontalSplitter, VerticalSplitter } from '../widgets/Splitter';
import FreeTableColumnEditor from './FreeTableColumnEditor';
import FreeTableGridCore from './FreeTableGridCore';
import MacroDetail from './MacroDetail';
import MacroManager from './MacroManager';
import WidgetColumnBar, { WidgetColumnBarItem } from '../widgets/WidgetColumnBar';
import useTheme from '../theme/useTheme';

const LeftContainer = styled.div`
  background-color: ${props => props.theme.manager_background};
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
    ..._.fromPairs((macro.args || []).filter(x => x.default != null).map(x => [x.name, x.default])),
    ..._.mapKeys(macroValues, (v, k) => k.replace(/^.*#/, '')),
  };
}

export default function FreeTableGrid(props) {
  const { modelState, dispatchModel } = props;
  const theme = useTheme();
  const [managerSize, setManagerSize] = React.useState(0);
  const [selectedMacro, setSelectedMacro] = React.useState(null);
  const [macroValues, setMacroValues] = React.useState({});
  const [selectedCells, setSelectedCells] = React.useState([]);
  const handleExecuteMacro = () => {
    const newModel = runMacro(
      selectedMacro,
      extractMacroValuesForMacro(macroValues, selectedMacro),
      modelState.value,
      false,
      selectedCells
    );
    dispatchModel({ type: 'set', value: newModel });
    setSelectedMacro(null);
  };
  // console.log('macroValues', macroValues);
  return (
    <HorizontalSplitter initialValue="300px" size={managerSize} setSize={setManagerSize}>
      <LeftContainer theme={theme}>
        <WidgetColumnBar>
          <WidgetColumnBarItem title="Columns" name="columns" height="40%">
            <FreeTableColumnEditor {...props} />
          </WidgetColumnBarItem>
          <WidgetColumnBarItem title="Macros" name="macros">
            <MacroManager
              {...props}
              managerSize={managerSize}
              selectedMacro={selectedMacro}
              setSelectedMacro={setSelectedMacro}
            />
          </WidgetColumnBarItem>
        </WidgetColumnBar>
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
