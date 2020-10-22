import { getChangeSetInsertedRows } from '@dbgate/datalib';
import React from 'react';
import DataGridCore from './DataGridCore';

export default function ChangeSetDataGrid(props) {
  const { changeSet, display, dispatchChangeSet } = props;
  function undo() {
    dispatchChangeSet({ type: 'undo' });
  }
  function redo() {
    dispatchChangeSet({ type: 'redo' });
  }

  const insertedRows = getChangeSetInsertedRows(changeSet, display.baseTable);

  return <DataGridCore {...props} insertedRowCount={insertedRows.length} undo={undo} redo={redo} />;
}
