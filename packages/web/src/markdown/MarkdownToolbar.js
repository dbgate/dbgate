import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function MarkdownToolbar({  showPreview }) {
  return (
    <>
      <ToolbarButton onClick={showPreview} icon="icon preview">
        Preview
      </ToolbarButton>
    </>
  );
}
