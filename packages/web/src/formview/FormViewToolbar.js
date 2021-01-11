import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function FormViewToolbar({ switchToTable, onNavigate, reload, reconnect, former, save }) {
  return (
    <>
      <ToolbarButton onClick={switchToTable} icon="icon table">
        Table view
      </ToolbarButton>
      <ToolbarButton onClick={() => onNavigate('begin')} icon="icon arrow-begin">
        First
      </ToolbarButton>
      <ToolbarButton onClick={() => onNavigate('previous')} icon="icon arrow-left">
        Previous
      </ToolbarButton>
      <ToolbarButton onClick={() => onNavigate('next')} icon="icon arrow-right">
        Next
      </ToolbarButton>
      <ToolbarButton onClick={() => onNavigate('end')} icon="icon arrow-end">
        Last
      </ToolbarButton>
      <ToolbarButton onClick={reload} icon="icon reload">
        Refresh
      </ToolbarButton>
      <ToolbarButton onClick={reconnect} icon="icon connection">
        Reconnect
      </ToolbarButton>
      <ToolbarButton disabled={!former.canUndo} onClick={() => former.undo()} icon="icon undo">
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={!former.canRedo} onClick={() => former.redo()} icon="icon redo">
        Redo
      </ToolbarButton>
      <ToolbarButton disabled={!former.allowSave} onClick={save} icon="icon save">
        Save
      </ToolbarButton>
      <ToolbarButton disabled={!former.containsChanges} onClick={() => former.revertAllChanges()} icon="icon close">
        Revert
      </ToolbarButton>
    </>
  );
}
