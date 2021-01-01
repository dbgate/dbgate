import React from 'react';
import useHasPermission from '../utility/useHasPermission';
import ToolbarButton from '../widgets/ToolbarButton';

export default function QueryToolbar({ execute, isDatabaseDefined, busy, save, format, isConnected, kill }) {
  const hasPermission = useHasPermission();
  return (
    <>
      <ToolbarButton disabled={!isDatabaseDefined || busy} onClick={execute} icon="icon run">
        Execute
      </ToolbarButton>
      {/* <ToolbarButton disabled={!busy} onClick={cancel} icon="icon close">
        Cancel
      </ToolbarButton> */}
      <ToolbarButton disabled={!isConnected} onClick={kill} icon="icon close">
        Kill
      </ToolbarButton>
      {hasPermission('files/sql/write') && (
        <ToolbarButton onClick={save} icon="icon save">
          Save
        </ToolbarButton>
      )}
      <ToolbarButton onClick={format} icon="icon format-code">
        Format
      </ToolbarButton>
    </>
  );
}
