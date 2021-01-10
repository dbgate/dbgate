import React from 'react';
import { DropDownMenuItem, DropDownMenuDivider } from '../modals/DropDownMenu';

export default function FormViewContextMenu({ switchToTable, onNavigate }) {
  return (
    <>
      <DropDownMenuItem onClick={switchToTable}>Table view</DropDownMenuItem>
      <DropDownMenuDivider />
      <DropDownMenuItem onClick={() => onNavigate('begin')}>Navigate to begin</DropDownMenuItem>
      <DropDownMenuItem onClick={() => onNavigate('previous')}>Navigate to previous</DropDownMenuItem>
      <DropDownMenuItem onClick={() => onNavigate('next')}>Navigate to next</DropDownMenuItem>
      <DropDownMenuItem onClick={() => onNavigate('end')}>Navigate to end</DropDownMenuItem>
    </>
  );
}
