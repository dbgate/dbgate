import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';
import styled from 'styled-components';
import { TabPage, TabControl } from '../widgets/TabControl';
import dimensions from '../theme/dimensions';
import GenericEditor from '../sqleditor/GenericEditor';
import MacroParameters from './MacroParameters';
import { WidgetTitle } from '../widgets/WidgetStyles';
import { FormButton } from '../utility/forms';
import FormStyledButton from '../widgets/FormStyledButton';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${props => props.theme.gridheader_background_cyan[0]};
  height: ${dimensions.toolBar.height}px;
  min-height: ${dimensions.toolBar.height}px;
  overflow: hidden;
  border-top: 1px solid ${props => props.theme.border};
  border-bottom: 1px solid ${props => props.theme.border};
`;

const Header = styled.div`
  font-weight: bold;
  margin-left: 10px;
  display: flex;
`;

const HeaderText = styled.div`
  margin-left: 10px;
`;

const MacroDetailContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const MacroDetailTabWrapper = styled.div`
  display: flex;
  overflow-y: auto;
`;

const MacroSection = styled.div`
  margin: 5px;
`;

const TextWrapper = styled.div`
  margin: 5px;
`;

const Buttons = styled.div`
  display: flex;
`;

function MacroHeader({ selectedMacro, setSelectedMacro, onExecute }) {
  const theme = useTheme();
  return (
    <Container theme={theme}>
      <Header>
        <FontIcon icon="img macro" />
        <HeaderText>{selectedMacro.title}</HeaderText>
      </Header>
      <Buttons>
        <ToolbarButton icon="icon run" onClick={onExecute} patchY={6}>
          Execute
        </ToolbarButton>
        <ToolbarButton icon="icon close" onClick={() => setSelectedMacro(null)} patchY={6}>
          Close
        </ToolbarButton>
      </Buttons>
    </Container>
  );
}

export default function MacroDetail({ selectedMacro, setSelectedMacro, onChangeValues, macroValues, onExecute }) {
  return (
    <MacroDetailContainer>
      <MacroHeader selectedMacro={selectedMacro} setSelectedMacro={setSelectedMacro} onExecute={onExecute} />
      <TabControl>
        <TabPage label="Macro detail" key="detail">
          <MacroDetailTabWrapper>
            <MacroSection>
              <WidgetTitle>Execute</WidgetTitle>
              <FormStyledButton value="Execute" onClick={onExecute} />
            </MacroSection>

            <MacroSection>
              <WidgetTitle>Parameters</WidgetTitle>
              {selectedMacro.args && selectedMacro.args.length > 0 ? (
                <MacroParameters
                  key={selectedMacro.name}
                  args={selectedMacro.args}
                  onChangeValues={onChangeValues}
                  macroValues={macroValues}
                  namePrefix={`${selectedMacro.name}#`}
                />
              ) : (
                <TextWrapper>This macro has no parameters</TextWrapper>
              )}
            </MacroSection>
            <MacroSection>
              <WidgetTitle>Description</WidgetTitle>
              <TextWrapper>{selectedMacro.description}</TextWrapper>
            </MacroSection>
          </MacroDetailTabWrapper>
        </TabPage>
        <TabPage label="JavaScript" key="javascript">
          <GenericEditor readOnly value={selectedMacro.code} mode="javascript" />
        </TabPage>
      </TabControl>
    </MacroDetailContainer>
  );
}
