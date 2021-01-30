import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryDesignToolbar({
  execute,
  isDatabaseDefined,
  busy,
  modelState,
  dispatchModel,
  isConnected,
  kill,
}) {
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined || busy} onClick={execute} icon="icon run">
        Execute
      </ToolbarButton>
      <ToolbarButton disabled={!isConnected} onClick={kill} icon="icon close">
        Kill
      </ToolbarButton>
      <ToolbarButton disabled={!modelState.canUndo} onClick={() => dispatchModel({ type: 'undo' })} icon="icon undo">
        Undo
      </ToolbarButton>
      <ToolbarButton disabled={!modelState.canRedo} onClick={() => dispatchModel({ type: 'redo' })} icon="icon redo">
        Redo
      </ToolbarButton>
    </>
  );
}
