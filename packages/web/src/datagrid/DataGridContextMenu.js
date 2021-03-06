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
  filterSelectedValue,
  openQuery,
  openFreeTable,
  openChartSelection,
  openActiveChart,
  switchToForm,
}) {
  return (
    <>
      {!!reload && (
        <DropDownMenuItem onClick={reload} keyText="F5">
          Reload
        </DropDownMenuItem>
      )}
      {!!reload && <DropDownMenuDivider />}
      <DropDownMenuItem onClick={copy} keyText="Ctrl+C">
        Copy
      </DropDownMenuItem>
      {revertRowChanges && (
        <DropDownMenuItem onClick={revertRowChanges} keyText="Ctrl+R">
          Revert row changes
        </DropDownMenuItem>
      )}
      {deleteSelectedRows && (
        <DropDownMenuItem onClick={deleteSelectedRows} keyText="Ctrl+Delete">
          Delete selected rows
        </DropDownMenuItem>
      )}
      {insertNewRow && (
        <DropDownMenuItem onClick={insertNewRow} keyText="Insert">
          Insert new row
        </DropDownMenuItem>
      )}
      <DropDownMenuDivider />
      {setNull && (
        <DropDownMenuItem onClick={setNull} keyText="Ctrl+0">
          Set NULL
        </DropDownMenuItem>
      )}
      {exportGrid && <DropDownMenuItem onClick={exportGrid}>Export</DropDownMenuItem>}
      {filterSelectedValue && (
        <DropDownMenuItem onClick={filterSelectedValue} keyText="Ctrl+F">
          Filter selected value
        </DropDownMenuItem>
      )}
      {openQuery && <DropDownMenuItem onClick={openQuery}>Open query</DropDownMenuItem>}
      <DropDownMenuItem onClick={openFreeTable}>Open selection in free table editor</DropDownMenuItem>
      <DropDownMenuItem onClick={openChartSelection}>Open chart from selection</DropDownMenuItem>
      {openActiveChart && <DropDownMenuItem onClick={openActiveChart}>Open active chart</DropDownMenuItem>}
      {!!switchToForm && (
        <DropDownMenuItem onClick={switchToForm} keyText="F4">
          Form view
        </DropDownMenuItem>
      )}
    </>
  );
}
