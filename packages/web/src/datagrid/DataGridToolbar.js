import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';
import { changeSetContainsChanges } from '@dbgate/datalib';

export default function DataGridToolbar({ reload, changeSetState, dispatchChangeSet, save, revert }) {
  return (
    <>
      <ToolbarButton onClick={reload}>Refresh</ToolbarButton>
      <ToolbarButton disabled={!changeSetState.canUndo} onClick={() => dispatchChangeSet({ type: 'undo' })}>
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={!changeSetState.canRedo} onClick={() => dispatchChangeSet({ type: 'redo' })}>
        Redo
      </ToolbarButton>
      <ToolbarButton disabled={!changeSetContainsChanges(changeSetState.value)} onClick={save}>
        Save
      </ToolbarButton>
      <ToolbarButton disabled={!changeSetContainsChanges(changeSetState.value)} onClick={revert}>
        Revert
      </ToolbarButton>
    </>
  );
}
