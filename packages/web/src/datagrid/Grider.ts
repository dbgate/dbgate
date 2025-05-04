export interface GriderRowStatus {
  status: 'regular' | 'updated' | 'deleted' | 'inserted' | 'missing';
  modifiedFields?: Set<string>;
  insertedFields?: Set<string>;
  deletedFields?: Set<string>;
  overlayFields?: { [field: string]: string };
  missingOverlayFields?: Set<string>;
}

export default abstract class Grider {
  abstract getRowData(index): any;
  abstract get rowCount(): number;

  getRowStatus(index): GriderRowStatus {
    const res: GriderRowStatus = {
      status: 'regular',
    };
    return res;
  }
  beginUpdate() {}
  endUpdate() {}
  setCellValue(index: number, uniqueName: string, value: any) {}
  deleteRow(index: number) {}
  insertRow(): number {
    return null;
  }
  insertDocuments(documents: any[]): number {
    return null;
  }
  revertRowChanges(index: number) {}
  revertAllChanges() {}
  undo() {}
  redo() {}
  get editable() {
    return false;
  }
  get canInsert() {
    return false;
  }
  get allowSave() {
    return this.containsChanges;
  }
  get rowCountInUpdate() {
    return this.rowCount;
  }
  get canUndo() {
    return false;
  }
  get canRedo() {
    return false;
  }
  get containsChanges() {
    return false;
  }
  get disableLoadNextPage() {
    return false;
  }
  get errors() {
    return null;
  }
  updateRow(index, changeObject) {
    for (const key of Object.keys(changeObject)) {
      this.setCellValue(index, key, changeObject[key]);
    }
  }
  getInsertedRowIndex(index) {
    return null;
  }
}
