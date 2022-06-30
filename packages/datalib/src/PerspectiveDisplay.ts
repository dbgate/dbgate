import { PerspectiveTableNode, PerspectiveTreeNode } from './PerspectiveTreeNode';
import _max from 'lodash/max';

export class PerspectiveDisplayColumn {
  title: string;
  dataField: string;
  parentColumns: string[] = [];
  display: PerspectiveDisplay;
  colSpanAtLevel = {};

  get rowSpan() {
    return this.display.columnLevelCount - this.parentColumns.length;
  }

  showParent(level: number) {
    return !!this.colSpanAtLevel[level];
  }

  getColSpan(level: number) {
    return this.colSpanAtLevel[level];
  }

  isVisible(level: number) {
    return level == this.columnLevel;
  }

  get columnLevel() {
    return this.parentColumns.length;
  }

  constructor() {}
}

export class PerspectiveDisplay {
  columns: PerspectiveDisplayColumn[] = [];
  readonly columnLevelCount: number;

  constructor(public root: PerspectiveTreeNode, public rows: any[]) {
    this.fillChildren(root.childNodes, []);
    this.columnLevelCount = _max(this.columns.map(x => x.parentColumns.length)) + 1;
  }

  fillChildren(children: PerspectiveTreeNode[], parentColumns: string[]) {
    for (const child of children) {
      if (child.isChecked) {
        this.processColumn(child, parentColumns);
      }
    }
  }

  processColumn(node: PerspectiveTreeNode, parentColumns: string[]) {
    if (node.isExpandable) {
      const countBefore = this.columns.length;
      this.fillChildren(node.childNodes, [...parentColumns, node.title]);

      if (this.columns.length > countBefore) {
        this.columns[countBefore].colSpanAtLevel[parentColumns.length] = this.columns.length - countBefore;
      }
    } else {
      const column = new PerspectiveDisplayColumn();
      column.title = node.columnTitle;
      column.dataField = node.dataField;
      column.parentColumns = parentColumns;
      column.display = this;
      this.columns.push(column);
    }
  }
}
