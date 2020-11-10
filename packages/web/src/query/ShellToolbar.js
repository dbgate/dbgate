import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function ShellToolbar({ execute, cancel, busy, edit, editAvailable }) {
  return (
    <>
      <ToolbarButton disabled={busy} onClick={execute} icon="icon run">
        Execute
      </ToolbarButton>
      <ToolbarButton disabled={!busy} onClick={cancel} icon="icon close">
        Cancel
      </ToolbarButton>
      <ToolbarButton disabled={!editAvailable} onClick={edit} icon="icon show-wizard">
        Show wizard
      </ToolbarButton>
    </>
  );
}
