import { FreeTableModel } from 'dbgate-datalib';
import Grider, { GriderRowStatus } from '../datagrid/Grider';

export default class FreeTableGrider extends Grider {
  public model: FreeTableModel;
  private batchModel: FreeTableModel;

  constructor(public modelState, public dispatchModel) {
    super();
    this.model = modelState && modelState.value;
  }
  getRowData(index: any) {
    return this.model.rows[index];
  }
  get rowCount() {
    return this.model.rows.length;
  }
  get currentModel(): FreeTableModel {
    return this.batchModel || this.model;
  }
  set currentModel(value) {
    if (this.batchModel) this.batchModel = value;
    else this.dispatchModel({ type: 'set', value });
  }
  setCellValue(index: number, uniqueName: string, value: any) {
    const model = this.currentModel;
    if (model.rows[index]) {
      this.currentModel = {
        ...model,
        rows: model.rows.map((row, i) => (index == i ? { ...row, [uniqueName]: value } : row)),
      };
    }
  }
  setRowData(index: number, document: any) {
    const model = this.currentModel;
    if (model.rows[index]) {
      this.currentModel = {
        ...model,
        rows: model.rows.map((row, i) => (index == i ? document : row)),
      };
    }
  }
  get editable() {
    return true;
  }
  get canInsert() {
    return true;
  }
  get allowSave() {
    return true;
  }
  insertRow(): number {
    const model = this.currentModel;
    this.currentModel = {
      ...model,
      rows: [...model.rows, {}],
    };
    return this.currentModel.rows.length - 1;
  }
  insertDocuments(documents: any[]): number {
    const model = this.currentModel;
    this.currentModel = {
      ...model,
      rows: [...model.rows, ...documents],
    };
    return this.currentModel.rows.length - documents.length;
  }

  deleteRow(index: number) {
    const model = this.currentModel;
    this.currentModel = {
      ...model,
      rows: model.rows.filter((row, i) => index != i),
    };
  }
  beginUpdate() {
    this.batchModel = this.model;
  }
  endUpdate() {
    if (this.model != this.batchModel) {
      this.dispatchModel({ type: 'set', value: this.batchModel });
      this.batchModel = null;
    }
  }

  // static factory({ modelState, dispatchModel }): FreeTableGrider {
  //   return new FreeTableGrider(modelState, dispatchModel);
  // }
  // static factoryDeps({ modelState, dispatchModel }) {
  //   return [modelState, dispatchModel];
  // }
  undo() {
    this.dispatchModel({ type: 'undo' });
  }
  redo() {
    this.dispatchModel({ type: 'redo' });
  }
  get canUndo() {
    return this.modelState.canUndo;
  }
  get canRedo() {
    return this.modelState.canRedo;
  }
}
