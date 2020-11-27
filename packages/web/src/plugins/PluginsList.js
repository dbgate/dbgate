import React from 'react';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';
import { openNewTab } from '../utility/common';
import { useSetOpenedTabs } from '../utility/globalState';
import { extractPluginIcon, extractPluginAuthor } from '../plugins/manifestExtractors';

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

const Icon = styled.img`
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

function openPlugin(setOpenedTabs, packageManifest) {
  openNewTab(setOpenedTabs, {
    title: packageManifest.name,
    icon: 'icon plugin',
    tabComponent: 'PluginTab',
    props: {
      packageName: packageManifest.name,
    },
  });
}

function PluginsListItem({ packageManifest }) {
  const setOpenedTabs = useSetOpenedTabs();
  const theme = useTheme();
  return (
    <Wrapper onClick={() => openPlugin(setOpenedTabs, packageManifest)} theme={theme}>
      <Icon src={extractPluginIcon(packageManifest)} />
      <Texts>
        <Line>
          <Name>{packageManifest.name}</Name>
          <Version>{packageManifest.version}</Version>
        </Line>
        <Line>
          <Description>{packageManifest.description}</Description>
        </Line>
        <Line>
          <Author>{extractPluginAuthor(packageManifest)}</Author>
        </Line>
      </Texts>
    </Wrapper>
  );
}

export default function PluginsList({ plugins }) {
  return (
    <>
      {plugins.map((packageManifest) => (
        <PluginsListItem packageManifest={packageManifest} key={packageManifest.name} />
      ))}
    </>
  );
}
