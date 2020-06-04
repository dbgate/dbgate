import React from 'react';
import { DropDownMenuItem, DropDownMenuDivider } from '../modals/DropDownMenu';

export default function DataGridContextMenu({
  copy,
  revertRowChanges,
  deleteSelectedRows,
  insertNewRow,
  setNull,
  reload,
  exportGrid,
}) {
  return (
    <>
      <DropDownMenuItem onClick={reload} keyText="F5">
        Reload
      </DropDownMenuItem>
      <DropDownMenuDivider />
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
      <DropDownMenuDivider />
      <DropDownMenuItem onClick={setNull} keyText="Ctrl+0">
        Set NULL
      </DropDownMenuItem>
      <DropDownMenuItem onClick={exportGrid} >
        Export
      </DropDownMenuItem>
    </>
  );
}
