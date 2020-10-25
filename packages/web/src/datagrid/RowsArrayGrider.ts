import Grider, { GriderRowStatus } from './Grider';

export default class RowsArrayGrider extends Grider {
  constructor(private rows: any[]) {
    super();
  }
  getRowData(index: any) {
    return this.rows[index];
  }
  get rowCount() {
    return this.rows.length;
  }

  static factory({ sourceRows }): RowsArrayGrider {
    return new RowsArrayGrider(sourceRows);
  }
  static factoryDeps({ sourceRows }) {
    return [sourceRows];
  }
}
