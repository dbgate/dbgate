import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function ChartToolbar({ save }) {
  return (
    <>
      <ToolbarButton onClick={save} icon="icon save">
        Save
      </ToolbarButton>
    </>
  );
}
