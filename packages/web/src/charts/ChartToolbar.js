import React from 'react';
import useHasPermission from '../utility/useHasPermission';
import ToolbarButton from '../widgets/ToolbarButton';

export default function ChartToolbar({ save, modelState, dispatchModel }) {
  const hasPermission = useHasPermission();

  return (
    <>
      {hasPermission('files/charts/write') && (
        <ToolbarButton onClick={save} icon="icon save">
          Save
        </ToolbarButton>
      )}
      <ToolbarButton disabled={!modelState.canUndo} onClick={() => dispatchModel({ type: 'undo' })} icon="icon undo">
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={!modelState.canRedo} onClick={() => dispatchModel({ type: 'redo' })} icon="icon redo">
        Redo
      </ToolbarButton>
    </>
  );
}
