import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import ObjectListControl from '../utility/ObjectListControl';
import { TableColumn } from '../utility/TableControl';
import columnAppObject from '../appobj/columnAppObject';
import constraintAppObject from '../appobj/constraintAppObject';
import { useTableInfo, useDbCore } from '../utility/metadataLoaders';
import useTheme from '../theme/useTheme';

const WhitePage = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.theme.main_background};
  overflow: auto;
`;

export default function PluginTab({ plugin }) {
  const theme = useTheme();
  return (
    <WhitePage theme={theme}>
      <div>{plugin.package.name}</div>
    </WhitePage>
  );
}
