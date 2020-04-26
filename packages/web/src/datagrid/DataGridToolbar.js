import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';
import { changeSetContainsChanges } from '@dbgate/datalib';

export default function DataGridToolbar({ reload, changeSetState, dispatchChangeSet, save, revert }) {
  return (
    <>
      <ToolbarButton onClick={reload} icon="fas fa-sync">
        Refresh
      </ToolbarButton>
      <ToolbarButton disabled={!changeSetState.canUndo} onClick={() => dispatchChangeSet({ type: 'undo' })} icon="fas fa-undo">
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={!changeSetState.canRedo} onClick={() => dispatchChangeSet({ type: 'redo' })} icon="fas fa-redo">
        Redo
      </ToolbarButton>
      <ToolbarButton disabled={!changeSetContainsChanges(changeSetState.value)} onClick={save} icon="fas fa-save">
        Save
      </ToolbarButton>
      <ToolbarButton disabled={!changeSetContainsChanges(changeSetState.value)} onClick={revert} icon="fas fa-times">
        Revert
      </ToolbarButton>
    </>
  );
}
