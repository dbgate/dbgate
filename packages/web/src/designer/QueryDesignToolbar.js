import React from 'react';
import useHasPermission from '../utility/useHasPermission';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryDesignToolbar({ execute, isDatabaseDefined, busy, save, modelState, dispatchModel }) {
  const hasPermission = useHasPermission();
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined || busy} onClick={execute} icon="icon run">
        Execute
      </ToolbarButton>
      {hasPermission('files/query/write') && (
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
