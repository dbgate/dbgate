import React from 'react';
import { ToolbarButton } from '../widgets/Toolbar';
import { changeSetContainsChanges } from '@dbgate/datalib';

export default function DataGridToolbar({ reload, changeSetState, dispatchChangeSet, save, revert }) {
  return (
    <>
      {changeSetState.canUndo && (
        <ToolbarButton onClick={() => dispatchChangeSet({ type: 'undo' })}>Undo</ToolbarButton>
      )}
      {changeSetState.canRedo && (
        <ToolbarButton onClick={() => dispatchChangeSet({ type: 'redo' })}>Redo</ToolbarButton>
      )}
      {changeSetContainsChanges(changeSetState.value) && <ToolbarButton onClick={save}>Save</ToolbarButton>}
      {changeSetContainsChanges(changeSetState.value) && <ToolbarButton onClick={revert}>Revert</ToolbarButton>}
      <ToolbarButton onClick={reload}>Refresh</ToolbarButton>
    </>
  );
}
