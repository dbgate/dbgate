import type { DesignerTableInfo } from './types';

export default class DomTableRef {
  domTable: Element;
  domWrapper: Element;
  table: DesignerTableInfo;
  designerId: string;
  domRefs: { [column: string]: Element };
  settings: any;

  constructor(table: DesignerTableInfo, domRefs, domWrapper: Element, settings) {
    this.domTable = domRefs[''];
    this.domWrapper = domWrapper;
    this.table = table;
    this.designerId = table.designerId;
    this.domRefs = domRefs;
    this.settings = settings;
  }

  getRect() {
    if (!this.domWrapper) return null;
    if (!this.domTable) return null;

    const wrap = this.domWrapper.getBoundingClientRect();
    const rect = this.domTable.getBoundingClientRect();
    return {
      left: rect.left - wrap.left,
      top: rect.top - wrap.top,
      right: rect.right - wrap.left,
      bottom: rect.bottom - wrap.top,
    };
  }

  getColumnY(columnName: string) {
    let col = this.domRefs[columnName];
    while (col == null && this.settings?.getParentColumnName && this.settings?.getParentColumnName(columnName)) {
      columnName = this.settings?.getParentColumnName(columnName);
      col = this.domRefs[columnName];
    }
    const tableRect = this.getRect();
    if (!col) return tableRect.top + 12;
    const rect = col.getBoundingClientRect();
    const wrap = this.domWrapper.getBoundingClientRect();
    let res = (rect.top + rect.bottom) / 2 - wrap.top;
    if (res < tableRect.top) res = tableRect.top;
    if (res > tableRect.bottom) res = tableRect.bottom;
    return res;
  }
}
