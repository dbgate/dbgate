import React from 'react';
import styled from 'styled-components';
import AceEditor from 'react-ace';
import useDimensions from '../utility/useDimensions';
import analyseQuerySources from './analyseQuerySources';
import keycodes from '../utility/keycodes';
import useCodeCompletion from './useCodeCompletion';
import useShowModal from '../modals/showModal';
import InsertJoinModal from '../modals/InsertJoinModal';
import { getDatabaseInfo } from '../utility/metadataLoaders';
import useTheme from '../theme/useTheme';
import { useShowMenu } from '../modals/showMenu';
import SqlEditorContextMenu from './SqlEditorContextMenu';
import sqlFormatter from 'sql-formatter';

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

// const COMMON_KEYWORDS = [
//   'select',
//   'where',
//   'update',
//   'delete',
//   'group',
//   'order',
//   'from',
//   'by',
//   'create',
//   'table',
//   'drop',
//   'alter',
//   'view',
//   'execute',
//   'procedure',
// ];

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
  onExecute = undefined,
}) {
  const [containerRef, { height, width }] = useDimensions();
  const ownEditorRef = React.useRef(null);
  const theme = useTheme();
  const showMenu = useShowMenu();

  const currentEditorRef = editorRef || ownEditorRef;
  const showModal = useShowModal();

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

  const handleInsertJoin = async () => {
    const dbinfo = await getDatabaseInfo({ conid, database });
    showModal(modalState => (
      <InsertJoinModal
        sql={currentEditorRef.current.editor.getValue()}
        modalState={modalState}
        engine={engine}
        dbinfo={dbinfo}
        onInsert={text => {
          const editor = currentEditorRef.current.editor;
          editor.session.insert(editor.getCursorPosition(), text);
        }}
      />
    ));
  };

  const handleKeyDown = React.useCallback(
    (data, hash, keyString, keyCode, event) => {
      if (keyCode == keycodes.j && event.ctrlKey && !readOnly && tabVisible) {
        event.preventDefault();
        handleInsertJoin();
      }

      if (onKeyDown) onKeyDown(data, hash, keyString, keyCode, event);
    },
    [onKeyDown]
  );

  React.useEffect(() => {
    if ((onKeyDown || !readOnly) && currentEditorRef.current) {
      currentEditorRef.current.editor.keyBinding.addKeyboardHandler(handleKeyDown);

      return () => {
        currentEditorRef.current.editor.keyBinding.removeKeyboardHandler(handleKeyDown);
      };
    }
  }, [handleKeyDown]);

  const handleFormatCode = () => {
    currentEditorRef.current.editor.setValue(sqlFormatter.format(editorRef.current.editor.getValue()));
    currentEditorRef.current.editor.clearSelection();
  };

  const menuRefs = React.useRef(null);
  menuRefs.current = {
    execute: onExecute,
    insertJoin: !readOnly ? handleInsertJoin : null,
    toggleComment: !readOnly ? () => currentEditorRef.current.editor.execCommand('togglecomment') : null,
    formatCode: !readOnly ? handleFormatCode : null,
  };
  const handleContextMenu = React.useCallback(event => {
    event.preventDefault();
    showMenu(event.pageX, event.pageY, <SqlEditorContextMenu {...menuRefs.current} />);
  }, []);

  React.useEffect(() => {
    if (currentEditorRef.current) {
      currentEditorRef.current.editor.container.addEventListener('contextmenu', handleContextMenu);

      return () => {
        currentEditorRef.current.editor.container.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [handleContextMenu]);

  return (
    <Wrapper ref={containerRef}>
      <AceEditor
        ref={currentEditorRef}
        mode={engineToMode[engine] || 'sql'}
        theme={theme.aceEditorTheme}
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
