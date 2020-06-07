import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function ShellToolbar({ execute, cancel, busy}) {
  return (
    <>
      <ToolbarButton disabled={busy} onClick={execute} icon="fas fa-play">
        Execute
      </ToolbarButton>
      <ToolbarButton disabled={!busy} onClick={cancel} icon="fas fa-times">
        Cancel
      </ToolbarButton>
    </>
  );
}
