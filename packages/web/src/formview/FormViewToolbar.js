import React from 'react';
import ToolbarButton from '../widgets/ToolbarButton';

export default function FormViewToolbar({ switchToTable, onNavigate }) {
  return (
    <>
      <ToolbarButton onClick={switchToTable} icon="icon table">
        Table view
      </ToolbarButton>
      <ToolbarButton onClick={() => onNavigate('begin')} icon="icon arrow-begin">
        First
      </ToolbarButton>
      <ToolbarButton onClick={() => onNavigate('previous')} icon="icon arrow-left">
        Previous
      </ToolbarButton>
      <ToolbarButton onClick={() => onNavigate('next')} icon="icon arrow-right">
        Next
      </ToolbarButton>
      <ToolbarButton onClick={() => onNavigate('end')} icon="icon arrow-end">
        Last
      </ToolbarButton>
    </>
  );
}
