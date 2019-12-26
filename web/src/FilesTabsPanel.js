import React from "react";
import styled from "styled-components";

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
    color: #338;
  }
  background-color: ${props => (props.selected ? "#eee" : "inherit")};
`;

export default function FilesTabsPanel() {
  return files.map(file => <FileTabItem {...file}>{file.name}</FileTabItem>);
}
