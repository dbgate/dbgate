import { FreeTableModel } from '@dbgate/datalib';
import Grider, { GriderRowStatus } from '../datagrid/Grider';

export default class FreeTableGrider extends Grider {
  public model: FreeTableModel;
  public rows: any[];
  constructor(public modelState, public dispatchModel) {
    super();
    this.model = modelState && modelState.value;
    this.rows = this.model.rows;
  }
  getRowData(index: any) {
    return this.rows[index];
  }
  get rowCount() {
    return this.rows.length;
  }

  static factory({ modelState, dispatchModel }): FreeTableGrider {
    return new FreeTableGrider(modelState, dispatchModel);
  }
  static factoryDeps({ modelState, dispatchModel }) {
    return [modelState, dispatchModel];
  }
}
