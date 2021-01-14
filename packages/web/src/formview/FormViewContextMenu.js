import React from 'react';
import { DropDownMenuItem, DropDownMenuDivider } from '../modals/DropDownMenu';

export default function FormViewContextMenu({ switchToTable, onNavigate, addToFilter, filterThisValue }) {
  return (
    <>
      <DropDownMenuItem onClick={switchToTable} keyText="F4">
        Table view
      </DropDownMenuItem>
      {addToFilter && <DropDownMenuItem onClick={addToFilter}>Add to filter</DropDownMenuItem>}
      {filterThisValue && (
        <DropDownMenuItem onClick={filterThisValue} keyText="Ctrl+F">
          Filter this value
        </DropDownMenuItem>
      )}
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
