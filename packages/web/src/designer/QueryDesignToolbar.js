import React from 'react';
import useHasPermission from '../utility/useHasPermission';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryDesignToolbar({ execute, isDatabaseDefined, busy, save }) {
  const hasPermission = useHasPermission();
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined || busy} onClick={execute} icon="icon run">
        Execute
      </ToolbarButton>
      {hasPermission('files/query/write') && (
        <ToolbarButton onClick={save} icon="icon save">
          Save
        </ToolbarButton>
      )}
    </>
  );
}
