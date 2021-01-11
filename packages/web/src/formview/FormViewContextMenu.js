import React from 'react';
import { DropDownMenuItem, DropDownMenuDivider } from '../modals/DropDownMenu';

export default function FormViewContextMenu({ switchToTable, onNavigate }) {
  return (
    <>
      <DropDownMenuItem onClick={switchToTable} keyText="F4">
        Table view
      </DropDownMenuItem>
      <DropDownMenuDivider />
      <DropDownMenuItem onClick={() => onNavigate('begin')} keyText="Ctrl+Home">
        Navigate to begin
      </DropDownMenuItem>
      <DropDownMenuItem onClick={() => onNavigate('previous')} keyText="Ctrl+Up">
        Navigate to previous
      </DropDownMenuItem>
      <DropDownMenuItem onClick={() => onNavigate('next')} keyText="Ctrl+Down">
        Navigate to next
      </DropDownMenuItem>
      <DropDownMenuItem onClick={() => onNavigate('end')} keyText="Ctrl+End">
        Navigate to end
      </DropDownMenuItem>
    </>
  );
}
