import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryToolbar({ execute, cancel, isDatabaseDefined, busy, save, format, isConnected, kill }) {
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined || busy} onClick={execute} icon="mdi mdi-play">
        Execute
      </ToolbarButton>
      <ToolbarButton disabled={!busy} onClick={cancel} icon="mdi mdi-close">
        Cancel
      </ToolbarButton>
      <ToolbarButton disabled={!isConnected} onClick={kill} icon="mdi mdi-close">
        Kill
      </ToolbarButton>
      <ToolbarButton onClick={save} icon="mdi mdi-save">
        Save
      </ToolbarButton>
      <ToolbarButton onClick={format} icon="mdi mdi-code-tags-check">
        Format
      </ToolbarButton>
    </>
  );
}
