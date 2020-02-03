import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import AceEditor from 'react-ace';
import useDimensions from '../utility/useDimensions';
import engines from '@dbgate/engines';

const Wrapper = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
`;

export default function TableCreateScriptTab({ conid, database, schemaName, pureName }) {
  const sql = `SELECT * FROM MOJE`;
  const [containerRef, { height, width }] = useDimensions();

  /** @type {import('@dbgate/types').TableInfo} */
  const tableInfo = useFetch({
    url: 'tables/table-info',
    params: { conid, database, schemaName, pureName },
  });

  /** @type {import('@dbgate/types').EngineDriver} */
  const driver = engines('mssql');
  const dumper = driver.createDumper();
  dumper.putCmd('^select * ^from %f', { schemaName, pureName });

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
