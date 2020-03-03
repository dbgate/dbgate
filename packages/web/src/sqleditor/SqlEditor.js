import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import AceEditor from 'react-ace';
import useDimensions from '../utility/useDimensions';
import engines from '@dbgate/engines';
import useTableInfo from '../utility/useTableInfo';
import useConnectionInfo from '../utility/useConnectionInfo';

const Wrapper = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
`;

const engineToMode = {
  mssql: 'sqlserver',
  mysql: 'mysql',
  postgre: 'pgsql',
};

export default function SqlEditor({ value, engine }) {
  const [containerRef, { height, width }] = useDimensions();

  return (
    <Wrapper ref={containerRef}>
      <AceEditor
        mode={engineToMode[engine] || 'sql'}
        theme="github"
        // onChange={onChange}
        name="UNIQUE_ID_OF_DIV"
        editorProps={{ $blockScrolling: true }}
        value={value}
        readOnly
        fontSize="11pt"
        width={`${width}px`}
        height={`${height}px`}
      />
    </Wrapper>
  );
}
