import React from 'react';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';
import { openNewTab } from '../utility/common';
import { useSetOpenedTabs } from '../utility/globalState';
import PluginIcon from './PluginIcon';

const Wrapper = styled.div`
  margin: 1px 3px 10px 5px;
  display: flex;
  align-items: center;
  &:hover {
    background-color: ${(props) => props.theme.left_background_blue[1]};
  }
`;

const Texts = styled.div`
  margin-left: 10px;
`;

const Name = styled.div`
  font-weight: bold;
`;

const Line = styled.div`
  display: flex;
`;

const Icon = styled(PluginIcon)`
  width: 50px;
  height: 50px;
`;

const Description = styled.div`
  font-style: italic;
`;

const Author = styled.div`
  font-weight: bold;
`;

const Version = styled.div`
  margin-left: 5px;
`;

function openPlugin(setOpenedTabs, plugin) {
  openNewTab(setOpenedTabs, {
    title: plugin.package.name,
    icon: 'icon plugin',
    tabComponent: 'PluginTab',
    props: {
      plugin,
    },
  });
}

function PluginsListItem({ plugin }) {
  const setOpenedTabs = useSetOpenedTabs();
  const theme = useTheme();
  return (
    <Wrapper onClick={() => openPlugin(setOpenedTabs, plugin)} theme={theme}>
      <Icon plugin={plugin} />
      <Texts>
        <Line>
          <Name>{plugin.package.name}</Name>
          <Version>{plugin.package.version}</Version>
        </Line>
        <Line>
          <Description>{plugin.package.description}</Description>
        </Line>
        <Line>
          <Author>{plugin.package.author && plugin.package.author.name}</Author>
        </Line>
      </Texts>
    </Wrapper>
  );
}

export default function PluginsList({ plugins }) {
  return (
    <>
      {plugins.map((plugin) => (
        <PluginsListItem plugin={plugin} key={plugin.package.name} />
      ))}
    </>
  );
}
