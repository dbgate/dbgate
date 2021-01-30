import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function ChartToolbar({ modelState, dispatchModel }) {
  return (
    <>
      <ToolbarButton disabled={!modelState.canUndo} onClick={() => dispatchModel({ type: 'undo' })} icon="icon undo">
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={!modelState.canRedo} onClick={() => dispatchModel({ type: 'redo' })} icon="icon redo">
        Redo
      </ToolbarButton>
    </>
  );
}
