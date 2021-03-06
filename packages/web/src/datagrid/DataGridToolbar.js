import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function DataGridToolbar({ reload, reconnect, grider, save, switchToForm }) {
  return (
    <>
      {switchToForm && (
        <ToolbarButton onClick={switchToForm} icon="icon form">
          Form view
        </ToolbarButton>
      )}
      <ToolbarButton onClick={reload} icon="icon reload">
        Refresh
      </ToolbarButton>
      <ToolbarButton onClick={reconnect} icon="icon connection">
        Reconnect
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
