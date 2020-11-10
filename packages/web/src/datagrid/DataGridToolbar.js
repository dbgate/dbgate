import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function DataGridToolbar({ reload, grider, save }) {
  return (
    <>
      <ToolbarButton onClick={reload} icon="icon reload">
        Refresh
      </ToolbarButton>
      <ToolbarButton disabled={!grider.canUndo} onClick={() => grider.undo()} icon="icon undo">
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={!grider.canRedo} onClick={() => grider.redo()} icon="icon redo">
        Redo
      </ToolbarButton>
      <ToolbarButton disabled={!grider.allowSave} onClick={save} icon="icon save">
        Save
      </ToolbarButton>
      <ToolbarButton disabled={!grider.containsChanges} onClick={() => grider.revertAllChanges()} icon="icon close">
        Revert
      </ToolbarButton>
    </>
  );
}
