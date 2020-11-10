import React from 'react';
import dimensions from '../theme/dimensions';
import styled from 'styled-components';
import { useCurrentWidget, useSetCurrentWidget } from '../utility/globalState';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';

const IconWrapper = styled.div`
  color: ${(props) => props.theme.widgetIconFontColor};
  font-size: ${dimensions.widgetMenu.iconFontSize};
  height: ${dimensions.widgetMenu.iconSize}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${(props) =>
    // @ts-ignore
    props.isSelected ? props.theme.widgetBackgroundSelected : 'inherit'};
  &:hover {
    background-color: ${(props) => props.theme.widgetBackgroundHover};
  }
`;

export default function WidgetIconPanel() {
  const theme = useTheme();
  const widgets = [
    {
      icon: 'icon database',
      name: 'database',
      title: 'Database connections',
    },
    // {
    //   icon: 'fa-table',
    //   name: 'table',
    // },
    {
      icon: 'icon file',
      name: 'file',
      title: 'Closed tabs & Saved SQL files',
    },
    {
      icon: 'icon archive',
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
          theme={theme}
        >
          <FontIcon icon={icon} />
        </IconWrapper>
      ))}
    </>
  );
}
