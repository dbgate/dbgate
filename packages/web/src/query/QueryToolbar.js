import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryToolbar({ execute, cancel, isDatabaseDefined, busy, save }) {
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined || busy} onClick={execute}>
        Execute
      </ToolbarButton>
      <ToolbarButton disabled={!busy} onClick={cancel}>
        Cancel
      </ToolbarButton>
      <ToolbarButton onClick={save}>Save</ToolbarButton>
    </>
  );
}
