import React from "react";
import theme from "./theme";
import styled from "styled-components";
import FilesTabsPanel from "./FilesTabsPanel";

const BodyDiv = styled.div`
  position: fixed;
  top: ${theme.tabsPanel.height}px;
  left: ${theme.widgetMenu.iconSize + theme.widgetMenu.panelWidth}px;
  bottom: ${theme.statusBar.height}px;
  right: 0;
  background-color: #eee;
`;

const IconBar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  bottom: ${theme.statusBar.height}px;
  width: ${theme.widgetMenu.iconSize}px;
  background-color: #222;
`;

const LeftMenu = styled.div`
  position: fixed;
  top: 0;
  left: ${theme.widgetMenu.iconSize}px;
  bottom: ${theme.statusBar.height}px;
  width: ${theme.widgetMenu.panelWidth}px;
  background-color: #ccc;
`;

const TabsPanel = styled.div`
  display: flex;
  position: fixed;
  top: 0;
  left: ${theme.widgetMenu.iconSize + theme.widgetMenu.panelWidth}px;
  height: ${theme.tabsPanel.height}px;
  right: 0;
  background-color: #ddd;
`;

const StausBar = styled.div`
  position: fixed;
  height: ${theme.statusBar.height}px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #00c;
`;

export default function Screen({ children }) {
  return (
    <>
      <IconBar></IconBar>
      <LeftMenu></LeftMenu>
      <TabsPanel><FilesTabsPanel></FilesTabsPanel></TabsPanel>
      <BodyDiv>{children}</BodyDiv>
      <StausBar></StausBar>
    </>
  );
}
