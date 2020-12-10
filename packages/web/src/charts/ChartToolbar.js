import React from 'react';
import useHasPermission from '../utility/useHasPermission';
import ToolbarButton from '../widgets/ToolbarButton';

export default function ChartToolbar({ save }) {
  const hasPermission = useHasPermission();

  return (
    <>
      {hasPermission('files/charts/write') && (
        <ToolbarButton onClick={save} icon="icon save">
          Save
        </ToolbarButton>
      )}
    </>
  );
}
