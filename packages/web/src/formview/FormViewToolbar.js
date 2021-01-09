import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function FormViewToolbar({ switchToTable }) {
  return (
    <>
      <ToolbarButton onClick={switchToTable} icon="icon table">
        Table view
      </ToolbarButton>
    </>
  );
}
