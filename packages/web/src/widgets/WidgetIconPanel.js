import React from 'react';
import theme from '../theme';
import styled from 'styled-components';
import { useCurrentWidget, useSetCurrentWidget } from '../utility/globalState';

const IconWrapper = styled.div`
  color: ${theme.widgetMenu.iconFontColor};
  font-size: ${theme.widgetMenu.iconFontSize};
  height: ${theme.widgetMenu.iconSize}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${(props) =>
    // @ts-ignore
    props.isSelected ? theme.widgetMenu.backgroundSelected : 'inherit'};
  &:hover {
    background-color: ${theme.widgetMenu.backgroundHover};
  }
`;

export default function WidgetIconPanel() {
  const widgets = [
    {
      icon: 'fa-database',
      name: 'database',
      title: 'Database connections',
    },
    // {
    //   icon: 'fa-table',
    //   name: 'table',
    // },
    {
      icon: 'fa-file-alt',
      name: 'file',
      title: 'Closed tabs & Saved SQL files',
    },
    {
      icon: 'fa-archive',
      name: 'archive',
      title: 'Archive (saved tabular data)',
    },
    // {
    //   icon: 'fa-cog',
    //   name: 'settings',
    // },
    // {
    //   icon: 'fa-check',
    //   name: 'settings',
    // },
  ];

  const currentWidget = useCurrentWidget();
  const setCurrentWidget = useSetCurrentWidget();

  return (
    <>
      {widgets.map(({ icon, name, title }) => (
        <IconWrapper
          key={icon}
          // @ts-ignore
          isSelected={name === currentWidget}
          onClick={() => setCurrentWidget(name === currentWidget ? null : name)}
          title={title}
        >
          <i className={`fas ${icon}`} />
        </IconWrapper>
      ))}
    </>
  );
}
