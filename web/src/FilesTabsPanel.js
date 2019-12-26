import React from "react";
import styled from "styled-components";
import theme from "./theme";

const files = [
  { name: "app.js" },
  { name: "BranchCategory", type: "table", selected: true },
  { name: "ApplicationList" }
];

const FileTabItem = styled.div`
  border-right: 1px solid white;
  padding-left: 15px;
  padding-right: 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
  &:hover {
    color: ${theme.tabsPanel.hoverFont};
  }
  background-color: ${props =>
    props.selected ? theme.mainArea.background : "inherit"};
`;

export default function FilesTabsPanel() {
  return files.map(file => <FileTabItem {...file}>{file.name}</FileTabItem>);
}
