import React from 'react';
import styled from 'styled-components';
import AceEditor from 'react-ace';
import useDimensions from '../utility/useDimensions';
import useTheme from '../theme/useTheme';

const Wrapper = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
`;

export default function JavaScriptEditor({
  value = undefined,
  readOnly = false,
  onChange = undefined,
  tabVisible = false,
  onKeyDown = undefined,
  editorRef = undefined,
  focusOnCreate = false,
}) {
  const [containerRef, { height, width }] = useDimensions();
  const ownEditorRef = React.useRef(null);
  const theme = useTheme();

  const currentEditorRef = editorRef || ownEditorRef;

  React.useEffect(() => {
    if ((tabVisible || focusOnCreate) && currentEditorRef.current && currentEditorRef.current.editor)
      currentEditorRef.current.editor.focus();
  }, [tabVisible, focusOnCreate]);

  const handleKeyDown = React.useCallback(
    async (data, hash, keyString, keyCode, event) => {
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
        mode="javascript"
        theme={theme.aceEditorTheme}
        onChange={onChange}
        name="UNIQUE_ID_OF_DIV"
        editorProps={{ $blockScrolling: true }}
        setOptions={{
          showPrintMargin: false,
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
