import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function DataGridToolbar({ reload, grider, save }) {
  return (
    <>
      <ToolbarButton onClick={reload} icon="mdi mdi-reload">
        Refresh
      </ToolbarButton>
      <ToolbarButton disabled={!grider.canUndo} onClick={() => grider.undo()} icon="mdi mdi-undo">
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={!grider.canRedo} onClick={() => grider.redo()} icon="mdi mdi-redo">
        Redo
      </ToolbarButton>
      <ToolbarButton disabled={!grider.allowSave} onClick={save} icon="mdi mdi-save">
        Save
      </ToolbarButton>
      <ToolbarButton disabled={!grider.containsChanges} onClick={() => grider.revertAllChanges()} icon="mdi mdi-close">
        Revert
      </ToolbarButton>
    </>
  );
}
