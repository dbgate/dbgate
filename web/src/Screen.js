// @ts-nocheck

import React from 'react';
import theme from './theme';
import styled from 'styled-components';
import TabsPanel from './TabsPanel';
import WidgetIconPanel from './widgets/WidgetIconPanel';
import { useCurrentWidget } from './utility/globalState';
import WidgetContainer from './widgets/WidgetContainer';

const BodyDiv = styled.div`
  position: fixed;
  top: ${theme.tabsPanel.height}px;
  left: ${props => theme.widgetMenu.iconSize + props.leftPanelWidth}px;
  bottom: ${theme.statusBar.height}px;
  right: 0;
  background-color: ${theme.mainArea.background};
`;

const IconBar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  bottom: ${theme.statusBar.height}px;
  width: ${theme.widgetMenu.iconSize}px;
  background-color: ${theme.widgetMenu.background};
`;

const LeftPanel = styled.div`
  position: fixed;
  top: 0;
  left: ${theme.widgetMenu.iconSize}px;
  bottom: ${theme.statusBar.height}px;
  width: ${theme.leftPanel.width}px;
  background-color: ${theme.leftPanel.background};
  display: flex;
`;

const TabsPanelContainer = styled.div`
  display: flex;
  position: fixed;
  top: 0;
  left: ${props => theme.widgetMenu.iconSize + props.leftPanelWidth}px;
  height: ${theme.tabsPanel.height}px;
  right: 0;
  background-color: ${theme.tabsPanel.background};
`;

const StausBar = styled.div`
  position: fixed;
  height: ${theme.statusBar.height}px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${theme.statusBar.background};
`;

export default function Screen({ children = undefined }) {
  const currentWidget = useCurrentWidget();
  const leftPanelWidth = currentWidget ? theme.leftPanel.width : 0;
  return (
    <>
      <IconBar>
        <WidgetIconPanel />
      </IconBar>
      {!!currentWidget && (
        <LeftPanel>
          <WidgetContainer />
        </LeftPanel>
      )}
      <TabsPanelContainer leftPanelWidth={leftPanelWidth}>
        <TabsPanel></TabsPanel>
      </TabsPanelContainer>
      <BodyDiv leftPanelWidth={leftPanelWidth}>{children}</BodyDiv>
      <StausBar></StausBar>
    </>
  );
}
