// @ts-nocheck

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

export default function InplaceEditor({ widthPx, value, definition, changeSet, setChangeSet, onClose, selectAll }) {
  const editorRef = React.useRef();
  const isChangedRef = React.createRef();
  React.useEffect(() => {
    const editor = editorRef.current;
    editor.value = value;
    editor.focus();
    if (selectAll) {
      editor.select();
    }
  }, []);
  function handleBlur() {
    if (isChangedRef.current) {
      const editor = editorRef.current;
      setChangeSet(setChangeSetValue(changeSet, definition, editor.value));
    }
  }
  function handleKeyDown(event) {
    switch (event.keyCode) {
      case keycodes.escape:
        isChangedRef.current = false;
        onClose();
        break;
    }
  }
  return (
    <StyledInput
      onBlur={handleBlur}
      ref={editorRef}
      type="text"
      onChange={() => (isChangedRef.current = true)}
      onKeyDown={handleKeyDown}
      style={{
        width: widthPx,
        minWidth: widthPx,
        maxWidth: widthPx,
      }}
    />
  );
}
