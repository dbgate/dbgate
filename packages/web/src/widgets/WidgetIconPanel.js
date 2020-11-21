import React from 'react';
import dimensions from '../theme/dimensions';
import styled from 'styled-components';
import { useCurrentWidget, useSetCurrentWidget } from '../utility/globalState';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';

const IconWrapper = styled.div`
  color: ${(props) => props.theme.widget_font2};
  font-size: ${dimensions.widgetMenu.iconFontSize};
  height: ${dimensions.widgetMenu.iconSize}px;
  display: flex;
  align-items: center;
  justify-content: center;

  ${(props) =>
    // @ts-ignore
    props.isSelected &&
    `
    background-color: ${props.theme.widget_background3};
    // position: relative;
    // border-left: 3px solid ${props.theme.widget_font1};
    // left: -3px;
    color: ${props.theme.widget_font1};
    `}

  &:hover {
    color: ${(props) => props.theme.widget_font1};
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
    {
      icon: 'icon plugin',
      name: 'plugins',
      title: 'Extensions & Plugins',
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
