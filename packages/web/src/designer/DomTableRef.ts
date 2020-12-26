import { TableInfo } from 'dbgate-types';

type DesignerTableInfo = TableInfo & { desingerId: string };

export default class DomTableRef {
  domTable: Element;
  domWrapper: Element;
  table: DesignerTableInfo;
  constructor(table: DesignerTableInfo, domRefs, domWrapper: Element) {
    this.domTable = domRefs[''];
    this.domWrapper = domWrapper;
    this.table = table;
  }

  getRect() {
    return this.domTable.getBoundingClientRect();
  }

  get designerId() {
    return this.table.desingerId;
  }
}
