import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import ReactMarkdown from 'react-markdown';
import ObjectListControl from '../utility/ObjectListControl';
import { TableColumn } from '../utility/TableControl';
import columnAppObject from '../appobj/columnAppObject';
import constraintAppObject from '../appobj/constraintAppObject';
import { useTableInfo, useDbCore } from '../utility/metadataLoaders';
import useTheme from '../theme/useTheme';
import useFetch from '../utility/useFetch';
import LoadingInfo from '../widgets/LoadingInfo';

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

const Title = styled.div`
  font-size: 20pt;
  border-bottom: 1px solid ${(props) => props.theme.border};
`;

export default function PluginTab({ plugin }) {
  const theme = useTheme();
  const packageName = plugin.package.name;
  const readme = useFetch({
    params: { packageName },
    url: 'plugins/readme',
    defaultValue: null,
  });
  return (
    <WhitePage theme={theme}>
      <Title theme={theme}>{packageName}</Title>
      {readme == null ? <LoadingInfo message="Loading extension detail" /> : <ReactMarkdown>{readme}</ReactMarkdown>}
    </WhitePage>
  );
}
