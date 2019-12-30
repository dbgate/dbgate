import React from "react";
import theme from "./theme";
import styled from "styled-components";
import { FontIcon } from "./icons";

const IconWrapper = styled.div`
  color: ${theme.widgetMenu.iconFontColor};
  font-size: ${theme.widgetMenu.iconFontSize};
  height: ${theme.widgetMenu.iconSize}px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background-color: ${theme.widgetMenu.backgroundHover};
  }
  background-color: ${props =>
    props.isSelected ? theme.widgetMenu.backgroundSelected : "inherit"};
`;

export default function SideIconPanel() {
  const widgets = [
    {
      icon: "fa-database"
    },
    {
      icon: "fa-table",
      isSelected: true
    },
    {
      icon: "fa-file-alt"
    },
    {
      icon: "fa-cog"
    },
    {
      icon: "fa-check"
    }
  ];

  return widgets.map(({ icon, isSelected }) => (
    <IconWrapper key={icon} isSelected={isSelected}>
      <div>
        <FontIcon name={icon} />
      </div>
    </IconWrapper>
  ));
}
