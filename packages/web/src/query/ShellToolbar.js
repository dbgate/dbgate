import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function ShellToolbar({ execute, cancel, busy, edit, editAvailable }) {
  return (
    <>
      <ToolbarButton disabled={busy} onClick={execute} icon="mdi mdi-play">
        Execute
      </ToolbarButton>
      <ToolbarButton disabled={!busy} onClick={cancel} icon="mdi mdi-close">
        Cancel
      </ToolbarButton>
      <ToolbarButton disabled={!editAvailable} onClick={edit} icon="mdi mdi-comment-edit">
        Show wizard
      </ToolbarButton>
    </>
  );
}
