import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import theme from '../theme';
import keycodes from '../utility/keycodes';
import { setChangeSetValue } from '@dbgate/datalib';

const StyledInput = styled.input`
  border: 0px solid;
  outline: none;
  margin: 0px;
  padding: 0px;
`;

export default function InplaceEditor({ widthPx, value, definition, changeSet, setChangeSet }) {
  const editorRef = React.useRef();
  React.useEffect(() => {
    const editor = editorRef.current;
    editor.value = value;
    editor.focus();
    editor.select();
  }, []);
  function handleBlur() {
    const editor = editorRef.current;
    setChangeSet(setChangeSetValue(changeSet, definition, editor.value));
  }
  return (
    <StyledInput
      onBlur={handleBlur}
      ref={editorRef}
      type="text"
      style={{
        width: widthPx,
        minWidth: widthPx,
        maxWidth: widthPx,
      }}
    />
  );
}
