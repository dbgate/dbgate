// @ts-nocheck

import React from 'react';
import theme from './theme';
import styled from 'styled-components';
import TabsPanel from './TabsPanel';
import TabContent from './TabContent';
import WidgetIconPanel from './widgets/WidgetIconPanel';
import { useCurrentWidget, useLeftPanelWidth, useSetLeftPanelWidth } from './utility/globalState';
import WidgetContainer from './widgets/WidgetContainer';
import ToolBar from './widgets/Toolbar';
import StatusBar from './widgets/StatusBar';
import { useSplitterDrag, HorizontalSplitHandle } from './widgets/Splitter';

const BodyDiv = styled.div`
  position: fixed;
  top: ${theme.tabsPanel.height + theme.toolBar.height}px;
  left: ${(props) => props.contentLeft}px;
  bottom: ${theme.statusBar.height}px;
  right: 0;
  background-color: ${theme.mainArea.background};
`;

const ToolBarDiv = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: ${theme.toolBar.background};
  height: ${theme.toolBar.height}px;
`;

const IconBar = styled.div`
  position: fixed;
  top: ${theme.toolBar.height}px;
  left: 0;
  bottom: ${theme.statusBar.height}px;
  width: ${theme.widgetMenu.iconSize}px;
  background-color: ${theme.widgetMenu.background};
`;

const LeftPanel = styled.div`
  position: fixed;
  top: ${theme.toolBar.height}px;
  left: ${theme.widgetMenu.iconSize}px;
  bottom: ${theme.statusBar.height}px;
  background-color: ${theme.leftPanel.background};
  display: flex;
`;

const TabsPanelContainer = styled.div`
  display: flex;
  position: fixed;
  top: ${theme.toolBar.height}px;
  left: ${(props) => props.contentLeft}px;
  height: ${theme.tabsPanel.height}px;
  right: 0;
  background-color: ${theme.tabsPanel.background};
  border-top: 1px solid #ccc;

  overflow-x: auto;

  ::-webkit-scrollbar {
    height: 7px;
  }
  ::-webkit-scrollbar-track {
    // -webkit-box-shadow: inset 0 0 2px rgba(0,0,0,0.3); 
    border-radius: 1px;
    background-color: #ddd;
  }
 
  ::-webkit-scrollbar-thumb {
    border-radius: 1px;
    // -webkit-box-shadow: inset 0 0 2px rgba(0,0,0,0.5); 
    background-color: #aaa;
    &:hover {
      background-color: #99c;
    }
  }  
}
`;

const StausBarContainer = styled.div`
  position: fixed;
  height: ${theme.statusBar.height}px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${theme.statusBar.background};
`;

const ScreenHorizontalSplitHandle = styled(HorizontalSplitHandle)`
  position: absolute;
  top: ${theme.toolBar.height}px;
  bottom: ${theme.statusBar.height}px;
`;

export default function Screen() {
  const currentWidget = useCurrentWidget();
  const leftPanelWidth = useLeftPanelWidth();
  const setLeftPanelWidth = useSetLeftPanelWidth();
  const contentLeft = currentWidget
    ? theme.widgetMenu.iconSize + leftPanelWidth + theme.splitter.thickness
    : theme.widgetMenu.iconSize;
  const toolbarPortalRef = React.useRef();
  const onSplitDown = useSplitterDrag('clientX', (diff) => setLeftPanelWidth((v) => v + diff));
  return (
    <>
      <ToolBarDiv>
        <ToolBar toolbarPortalRef={toolbarPortalRef} />
      </ToolBarDiv>
      <IconBar>
        <WidgetIconPanel />
      </IconBar>
      {!!currentWidget && (
        <LeftPanel>
          <WidgetContainer />
        </LeftPanel>
      )}
      {!!currentWidget && (
        <ScreenHorizontalSplitHandle
          onMouseDown={onSplitDown}
          style={{ left: leftPanelWidth + theme.widgetMenu.iconSize }}
        />
      )}
      <TabsPanelContainer contentLeft={contentLeft}>
        <TabsPanel></TabsPanel>
      </TabsPanelContainer>
      <BodyDiv contentLeft={contentLeft}>
        <TabContent toolbarPortalRef={toolbarPortalRef} />
      </BodyDiv>
      <StausBarContainer>
        <StatusBar />
      </StausBarContainer>
    </>
  );
}
