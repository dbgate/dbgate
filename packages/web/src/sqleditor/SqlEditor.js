import React from 'react';
import styled from 'styled-components';
import AceEditor from 'react-ace';
import useDimensions from '../utility/useDimensions';
import analyseQuerySources from './analyseQuerySources';
import keycodes from '../utility/keycodes';
import useCodeCompletion from './useCodeCompletion';
import showModal from '../modals/showModal';
import InsertJoinModal from '../modals/InsertJoinModal';
import { getDatabaseInfo } from '../utility/metadataLoaders';

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

const COMMON_KEYWORDS = [
  'select',
  'where',
  'update',
  'delete',
  'group',
  'order',
  'from',
  'by',
  'create',
  'table',
  'drop',
  'alter',
  'view',
  'execute',
  'procedure',
];

export default function SqlEditor({
  value = undefined,
  engine = undefined,
  readOnly = false,
  onChange = undefined,
  tabVisible = false,
  onKeyDown = undefined,
  editorRef = undefined,
  focusOnCreate = false,
  conid = undefined,
  database = undefined,
}) {
  const [containerRef, { height, width }] = useDimensions();
  const ownEditorRef = React.useRef(null);

  const currentEditorRef = editorRef || ownEditorRef;

  useCodeCompletion({
    conid,
    database,
    tabVisible,
    currentEditorRef,
  });

  React.useEffect(() => {
    if ((tabVisible || focusOnCreate) && currentEditorRef.current && currentEditorRef.current.editor)
      currentEditorRef.current.editor.focus();
  }, [tabVisible, focusOnCreate]);

  const handleKeyDown = React.useCallback(
    async (data, hash, keyString, keyCode, event) => {
      if (keyCode == keycodes.j && event.ctrlKey && !readOnly && tabVisible) {
        event.preventDefault();
        const dbinfo = await getDatabaseInfo({ conid, database });
        showModal((modalState) => (
          <InsertJoinModal
            sql={currentEditorRef.current.editor.getValue()}
            modalState={modalState}
            engine={engine}
            dbinfo={dbinfo}
            onInsert={(text) => {
              const editor = currentEditorRef.current.editor;
              editor.session.insert(editor.getCursorPosition(), text);
            }}
          />
        ));
      }

      if (onKeyDown) onKeyDown(data, hash, keyString, keyCode, event);
    },
    [onKeyDown]
  );

  React.useEffect(() => {
    if ((onKeyDown || !readOnly) && currentEditorRef.current) {
      currentEditorRef.current.editor.keyBinding.addKeyboardHandler(handleKeyDown);
    }
    return () => {
      currentEditorRef.current.editor.keyBinding.removeKeyboardHandler(handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Wrapper ref={containerRef}>
      <AceEditor
        ref={currentEditorRef}
        mode={engineToMode[engine] || 'sql'}
        theme="github"
        onChange={onChange}
        name="UNIQUE_ID_OF_DIV"
        editorProps={{ $blockScrolling: true }}
        setOptions={{
          enableBasicAutocompletion: true,
          // enableLiveAutocompletion: true,
          // enableSnippets: true,
          showPrintMargin: false,
          // showGutter: false,
          // showLineNumbers: true,
          // tabSize: 2
        }}
        value={value}
        readOnly={readOnly}
        fontSize="11pt"
        width={`${width}px`}
        height={`${height}px`}
      />
    </Wrapper>
  );
}
