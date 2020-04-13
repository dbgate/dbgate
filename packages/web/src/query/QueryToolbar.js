import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryToolbar({ execute, cancel, isDatabaseDefined, busy }) {
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined || busy} onClick={execute}>
        Execute
      </ToolbarButton>
      <ToolbarButton disabled={!busy} onClick={cancel}>
        Cancel
      </ToolbarButton>
    </>
  );
}
