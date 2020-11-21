import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import ReactMarkdown from 'react-markdown';
import useTheme from '../theme/useTheme';
import useFetch from '../utility/useFetch';
import LoadingInfo from '../widgets/LoadingInfo';
import { extractPluginIcon, extractPluginAuthor } from '../plugins/manifestExtractors';
import FormStyledButton from '../widgets/FormStyledButton';
import axios from '../utility/axios';
import { useInstalledPlugins } from '../utility/metadataLoaders';

const WhitePage = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.theme.main_background};
  overflow: auto;
  padding: 10px;
`;

const Icon = styled.img`
  width: 80px;
  height: 80px;
`;

const Header = styled.div`
  display: flex;
  border-bottom: 1px solid ${(props) => props.theme.border};
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

export default function PluginTab({ packageName }) {
  const theme = useTheme();
  const installed = useInstalledPlugins();
  const info = useFetch({
    params: { packageName },
    url: 'plugins/info',
    defaultValue: null,
  });
  const { readme, manifest } = info || {};
  const handleInstall = async () => {
    axios.post('plugins/install', { packageName });
  };
  const handleUninstall = async () => {
    axios.post('plugins/uninstall', { packageName });
  };

  return (
    <WhitePage theme={theme}>
      {info == null || manifest == null ? (
        <LoadingInfo message="Loading extension detail" />
      ) : (
        <>
          <Header theme={theme}>
            <Icon src={extractPluginIcon(manifest)} />
            <HeaderBody>
              <Title theme={theme}>{packageName}</Title>
              <HeaderLine>
                <Author>{extractPluginAuthor(manifest)}</Author>
                <Delimiter />
                <Version>{manifest.version && manifest.version}</Version>
              </HeaderLine>
              <HeaderLine>
                {!installed.find((x) => x.name == packageName) && (
                  <FormStyledButton type="button" value="Install" onClick={handleInstall} />
                )}
                {!!installed.find((x) => x.name == packageName) && (
                  <FormStyledButton type="button" value="Uninstall" onClick={handleUninstall} />
                )}
              </HeaderLine>
            </HeaderBody>
          </Header>
          <ReactMarkdown>{readme}</ReactMarkdown>
        </>
      )}
    </WhitePage>
  );
}
