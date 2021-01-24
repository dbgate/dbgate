import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function TableEditorToolbar({ addColumn, save }) {
  return (
    <>
      <ToolbarButton onClick={addColumn} icon="icon add">
        Add column
      </ToolbarButton>
      <ToolbarButton disabled={!save} onClick={save} icon="icon save">
        Save
      </ToolbarButton>
    </>
  );
}
