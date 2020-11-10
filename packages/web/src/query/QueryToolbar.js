import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryToolbar({ execute, cancel, isDatabaseDefined, busy, save, format, isConnected, kill }) {
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined || busy} onClick={execute} icon="icon run">
        Execute
      </ToolbarButton>
      <ToolbarButton disabled={!busy} onClick={cancel} icon="icon close">
        Cancel
      </ToolbarButton>
      <ToolbarButton disabled={!isConnected} onClick={kill} icon="icon close">
        Kill
      </ToolbarButton>
      <ToolbarButton onClick={save} icon="icon save">
        Save
      </ToolbarButton>
      <ToolbarButton onClick={format} icon="icon format-code">
        Format
      </ToolbarButton>
    </>
  );
}
