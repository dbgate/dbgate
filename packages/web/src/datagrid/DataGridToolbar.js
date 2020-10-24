import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function DataGridToolbar({ reload, grider, save }) {
  return (
    <>
      <ToolbarButton onClick={reload} icon="fas fa-sync">
        Refresh
      </ToolbarButton>
      <ToolbarButton disabled={!grider.canUndo} onClick={() => grider.undo()} icon="fas fa-undo">
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={!grider.canRedo} onClick={() => grider.redo()} icon="fas fa-redo">
        Redo
      </ToolbarButton>
      <ToolbarButton disabled={!grider.containsChanges} onClick={save} icon="fas fa-save">
        Save
      </ToolbarButton>
      <ToolbarButton disabled={!grider.containsChanges} onClick={() => grider.revertAllChanges()} icon="fas fa-times">
        Revert
      </ToolbarButton>
    </>
  );
}
