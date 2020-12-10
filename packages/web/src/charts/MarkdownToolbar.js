import React from 'react';
import useHasPermission from '../utility/useHasPermission';
import ToolbarButton from '../widgets/ToolbarButton';

export default function MarkdownToolbar({ save }) {
  const hasPermission = useHasPermission();

  return (
    <>
      {hasPermission('files/markdown/write') && (
        <ToolbarButton onClick={save} icon="icon save">
          Save
        </ToolbarButton>
      )}
    </>
  );
}
