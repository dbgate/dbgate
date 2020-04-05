import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryToolbar({ execute,isDatabaseDefined }) {
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined} onClick={execute}>Execute</ToolbarButton>
    </>
  );
}
