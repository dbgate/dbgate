export interface GriderRowStatus {
  status: 'regular' | 'updated' | 'deleted' | 'inserted';
  modifiedFields: Set<string>;
}

export default abstract class Grider {
  abstract getRowData(index): any;
  abstract get rowCount(): number;

  getRowsSample() {
    return [this.getRowData(0)];
  }

  getRowStatus(index): GriderRowStatus {
    const res: GriderRowStatus = {
      status: 'regular',
      modifiedFields: new Set(),
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
  revertRowChanges(index: number) {}
  revertAllChanges() {}
  undo() {}
  redo() {}
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
  updateRow(index, changeObject) {
    for (const key of Object.keys(changeObject)) {
      this.setCellValue(index, key, changeObject[key]);
    }
  }
}
