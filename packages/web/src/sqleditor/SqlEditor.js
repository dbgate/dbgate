import React from 'react';
import styled from 'styled-components';
import AceEditor from 'react-ace';
import useDimensions from '../utility/useDimensions';
import { addCompleter } from 'ace-builds/src-noconflict/ext-language_tools';
import { useDatabaseInfo, getDatabaseInfo } from '../utility/metadataLoaders';
// import { Autocomplete } from 'ace-builds';

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
  focusOnCreate = false,
  conid = undefined,
  database = undefined,
}) {
  const [containerRef, { height, width }] = useDimensions();
  const ownEditorRef = React.useRef(null);

  const currentEditorRef = editorRef || ownEditorRef;

  React.useEffect(() => {
    if ((tabVisible || focusOnCreate) && currentEditorRef.current && currentEditorRef.current.editor)
      currentEditorRef.current.editor.focus();
  }, [tabVisible, focusOnCreate]);

  React.useEffect(() => {
    if (onKeyDown && currentEditorRef.current) {
      currentEditorRef.current.editor.keyBinding.addKeyboardHandler(onKeyDown);
    }
    return () => {
      currentEditorRef.current.editor.keyBinding.removeKeyboardHandler(onKeyDown);
    };
  }, [onKeyDown]);

  React.useEffect(() => {
    addCompleter({
      getCompletions: async function (editor, session, pos, prefix, callback) {
        const cursor = session.selection.cursor;
        const line = session.getLine(cursor.row).slice(0, cursor.column);
        const dbinfo = await getDatabaseInfo({ conid, database });

        if (/from\s*$/i.test(line)) {
          if (dbinfo) {
            const list = [
              ...dbinfo.tables.map((x) => ({
                name: x.pureName,
                value: x.pureName,
                caption: x.pureName,
                meta: 'table',
                score: 1000,
              })),
              ...dbinfo.views.map((x) => ({
                name: x.pureName,
                value: x.pureName,
                caption: x.pureName,
                meta: 'view',
                score: 1000,
              })),
            ];
            callback(null, list);
          }
        }
      },
    });

    const doLiveAutocomplete = function (e) {
      const editor = e.editor;
      // var hasCompleter = editor.completer && editor.completer.activated;
      const session = editor.session;
      const cursor = session.selection.cursor;
      const line = session.getLine(cursor.row).slice(0, cursor.column);

      // We don't want to autocomplete with no prefix
      if (e.command.name === 'backspace') {
        // do not hide after backspace
      } else if (e.command.name === 'insertstring') {
       
        if (e.args == ' ' || e.args == '.') {
          if (/from\s*$/i.test(line)) {
            console.log('FROM', line);
            currentEditorRef.current.editor.execCommand('startAutocomplete');
          }
        }
        // console.log('e.command', e.command);
        // console.log('e.args', e.args);

        // if (!hasCompleter) {
        //   startAutocomplete
        //   // // always start completer
        //   // var completer = Autocomplete.for(editor);
        //   // // Disable autoInsert
        //   // completer.autoInsert = false;
        //   // completer.showPopup(editor);
        // }
      }
    };

    currentEditorRef.current.editor.commands.on('afterExec', doLiveAutocomplete);
  }, []);

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
