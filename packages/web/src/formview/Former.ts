// export interface GriderRowStatus {
//     status: 'regular' | 'updated' | 'deleted' | 'inserted';
//     modifiedFields?: Set<string>;
//     insertedFields?: Set<string>;
//     deletedFields?: Set<string>;
//   }

export default abstract class Former {
  public rowData: any;

  // getRowStatus(index): GriderRowStatus {
  //   const res: GriderRowStatus = {
  //     status: 'regular',
  //   };
  //   return res;
  // }
  beginUpdate() {}
  endUpdate() {}
  setCellValue(uniqueName: string, value: any) {}
  revertRowChanges() {}
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
  updateRow(changeObject) {
    for (const key of Object.keys(changeObject)) {
      this.setCellValue(key, changeObject[key]);
    }
  }
}
