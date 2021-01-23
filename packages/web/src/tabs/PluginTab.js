import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import Markdown from 'markdown-to-jsx';
import useTheme from '../theme/useTheme';
import useFetch from '../utility/useFetch';
import LoadingInfo from '../widgets/LoadingInfo';
import compareVersions from 'compare-versions';
import { extractPluginIcon, extractPluginAuthor } from '../plugins/manifestExtractors';
import FormStyledButton from '../widgets/FormStyledButton';
import axios from '../utility/axios';
import { useInstalledPlugins } from '../utility/metadataLoaders';
import useHasPermission from '../utility/useHasPermission';

const WhitePage = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.main_background};
  overflow: auto;
  padding: 10px;
`;

const Icon = styled.img`
  width: 80px;
  height: 80px;
`;

const Header = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.border};
  margin-bottom: 20px;
  padding-bottom: 20px;
`;

const HeaderBody = styled.div`
  margin-left: 10px;
`;

const Title = styled.div`
  font-size: 20pt;
`;

const HeaderLine = styled.div`
  margin-top: 5px;
`;

const Author = styled.span`
  font-weight: bold;
`;

const Version = styled.span``;

function Delimiter() {
  return <span> | </span>;
}

function PluginTabCore({ packageName }) {
  const hasPermission = useHasPermission();
  const theme = useTheme();
  const installed = useInstalledPlugins();
  const info = useFetch({
    params: { packageName },
    url: 'plugins/info',
    defaultValue: null,
  });
  let { readme, manifest } = info || {};
  const handleInstall = async () => {
    axios.post('plugins/install', { packageName });
  };
  const handleUninstall = async () => {
    axios.post('plugins/uninstall', { packageName });
  };
  const handleUpgrade = async () => {
    axios.post('plugins/upgrade', { packageName });
  };

  if (info == null) {
    return <LoadingInfo message="Loading extension detail" />;
  }

  const installedFound = installed.find(x => x.name == packageName);
  const onlineFound = manifest;

  if (manifest == null) {
    if (installedFound) {
      manifest = installedFound;
      readme = installedFound.readme;
    }
    if (manifest == null) {
      return null;
    }
  }

  return (
    <>
      <Header theme={theme}>
        <Icon src={extractPluginIcon(manifest)} />
        <HeaderBody>
          <Title theme={theme}>{packageName}</Title>
          <HeaderLine>
            <Author>{extractPluginAuthor(manifest)}</Author>
            <Delimiter />
            <Version>{installedFound ? installedFound.version : manifest.version}</Version>
          </HeaderLine>
          <HeaderLine>
            {hasPermission('plugins/install') && !installedFound && (
              <FormStyledButton type="button" value="Install" onClick={handleInstall} />
            )}
            {hasPermission('plugins/install') && !!installedFound && (
              <FormStyledButton type="button" value="Uninstall" onClick={handleUninstall} />
            )}
            {hasPermission('plugins/install') &&
              installedFound &&
              onlineFound &&
              compareVersions(onlineFound.version, installedFound.version) > 0 && (
                <FormStyledButton type="button" value="Upgrade" onClick={handleUpgrade} />
              )}
          </HeaderLine>
        </HeaderBody>
      </Header>
      <Markdown>{readme}</Markdown>
    </>
  );
}

export default function PluginTab({ packageName }) {
  const theme = useTheme();
  return (
    <WhitePage theme={theme}>
      <PluginTabCore packageName={packageName} />
    </WhitePage>
  );
}

PluginTab.matchingProps = ['packageName'];
