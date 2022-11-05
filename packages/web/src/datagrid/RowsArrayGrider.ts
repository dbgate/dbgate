import Grider from './Grider';

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
}
