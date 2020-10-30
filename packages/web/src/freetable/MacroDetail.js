import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';
import styled from 'styled-components';
import { ReferenceIcon } from '../icons';
import { TabPage, TabControl } from '../widgets/TabControl';
import theme from '../theme';
import JavaScriptEditor from '../sqleditor/JavaScriptEditor';
import MacroParameters from './MacroParameters';

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ddeeee;
  height: ${theme.toolBar.height}px;
  min-height: ${theme.toolBar.height}px;
  overflow: hidden;
  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
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

function MacroHeader({ selectedMacro, setSelectedMacro }) {
  return (
    <Container>
      <Header>
        <ReferenceIcon />
        <HeaderText>{selectedMacro.title}</HeaderText>
      </Header>
      <ToolbarButton icon="fas fa-times" onClick={() => setSelectedMacro(null)} patchY={6}>
        Close
      </ToolbarButton>
    </Container>
  );
}

export default function MacroDetail({ selectedMacro, setSelectedMacro, onChangeValues, macroValues }) {
  return (
    <MacroDetailContainer>
      <MacroHeader selectedMacro={selectedMacro} setSelectedMacro={setSelectedMacro} />
      <TabControl>
        <TabPage label="Execute" key="execute">
          <MacroParameters args={selectedMacro.args} onChangeValues={onChangeValues} initialValues={macroValues} />
        </TabPage>
        <TabPage label="JavaScript" key="javascript">
          <JavaScriptEditor readOnly value={selectedMacro.code} />
        </TabPage>
      </TabControl>
    </MacroDetailContainer>
  );
}
