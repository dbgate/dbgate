import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryToolbar({ execute, cancel, isDatabaseDefined, busy, save, format }) {
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined || busy} onClick={execute} icon="fas fa-play">
        Execute
      </ToolbarButton>
      <ToolbarButton disabled={!busy} onClick={cancel} icon="fas fa-times">
        Cancel
      </ToolbarButton>
      <ToolbarButton onClick={save} icon="fas fa-save">
        Save
      </ToolbarButton>
      <ToolbarButton onClick={format} icon="fas fa-code">
        Format
      </ToolbarButton>
    </>
  );
}
