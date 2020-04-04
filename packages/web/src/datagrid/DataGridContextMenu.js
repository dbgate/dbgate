import React from 'react';
import { DropDownMenuItem } from '../modals/DropDownMenu';

export default function DataGridContextMenu({ copy, revertRowChanges, deleteSelectedRows, insertNewRow, reload }) {
  return (
    <>
      <DropDownMenuItem onClick={reload} keyText="F5">
        Reload
      </DropDownMenuItem>
      <DropDownMenuItem onClick={copy} keyText="Ctrl+C">
        Copy
      </DropDownMenuItem>
      <DropDownMenuItem onClick={revertRowChanges} keyText="Ctrl+R">
        Revert row changes
      </DropDownMenuItem>
      <DropDownMenuItem onClick={deleteSelectedRows} keyText="Ctrl+Delete">
        Delete selected rows
      </DropDownMenuItem>
      <DropDownMenuItem onClick={insertNewRow} keyText="Insert">
        Insert new row
      </DropDownMenuItem>
    </>
  );
}
