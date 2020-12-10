import React from 'react';
import useHasPermission from '../utility/useHasPermission';
import ToolbarButton from '../widgets/ToolbarButton';

export default function ShellToolbar({ execute, cancel, busy, edit, save, editAvailable }) {
  const hasPermission = useHasPermission();
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
      {hasPermission('files/shell/write') && (
        <ToolbarButton onClick={save} icon="icon save">
          Save
        </ToolbarButton>
      )}
    </>
  );
}
