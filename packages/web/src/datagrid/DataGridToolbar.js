import React from 'react';
import { ToolbarButton } from '../widgets/Toolbar';

export default function DataGridToolbar({ reload }) {
  return <ToolbarButton onClick={reload}>Refresh</ToolbarButton>;
}
