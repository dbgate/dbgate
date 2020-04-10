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

export default function SqlEditor({
  value = undefined,
  engine = undefined,
  readOnly = false,
  onChange = undefined,
  tabVisible = false,
  onKeyDown = undefined,
  editorRef = undefined,
}) {
  const [containerRef, { height, width }] = useDimensions();
  const ownEditorRef = React.useRef(null);

  const currentEditorRef = editorRef || ownEditorRef;

  React.useEffect(() => {
    if (tabVisible && currentEditorRef.current && currentEditorRef.current.editor) currentEditorRef.current.editor.focus();
  }, [tabVisible]);

  React.useEffect(() => {
    if (onKeyDown && currentEditorRef.current) {
      currentEditorRef.current.editor.keyBinding.addKeyboardHandler(onKeyDown);
    }
    return () => {
      currentEditorRef.current.editor.keyBinding.removeKeyboardHandler(onKeyDown);
    };
  }, [onKeyDown]);

  return (
    <Wrapper ref={containerRef}>
      <AceEditor
        ref={currentEditorRef}
        mode={engineToMode[engine] || 'sql'}
        theme="github"
        onChange={onChange}
        name="UNIQUE_ID_OF_DIV"
        editorProps={{ $blockScrolling: true }}
        value={value}
        readOnly={readOnly}
        fontSize="11pt"
        width={`${width}px`}
        height={`${height}px`}
      />
    </Wrapper>
  );
}
