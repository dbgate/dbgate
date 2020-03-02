import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import AceEditor from 'react-ace';
import useDimensions from '../utility/useDimensions';
import engines from '@dbgate/engines';
import useTableInfo from '../utility/useTableInfo';

const Wrapper = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
`;

export default function TableCreateScriptTab({ conid, database, schemaName, pureName }) {
  const [containerRef, { height, width }] = useDimensions();

  const tableInfo = useTableInfo({ conid, database, schemaName, pureName });

  console.log(tableInfo);

  const driver = engines('mssql');
  const dumper = driver.createDumper();
  if (tableInfo) dumper.createTable(tableInfo);

  return (
    <Wrapper ref={containerRef}>
      <AceEditor
        mode="sql"
        theme="github"
        // onChange={onChange}
        name="UNIQUE_ID_OF_DIV"
        editorProps={{ $blockScrolling: true }}
        value={dumper.s}
        readOnly
        fontSize="11pt"
        width={`${width}px`}
        height={`${height}px`}
      />
    </Wrapper>
  );
}
