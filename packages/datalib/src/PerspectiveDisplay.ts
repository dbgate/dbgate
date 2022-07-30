import { getTableChildPerspectiveNodes, PerspectiveTableNode, PerspectiveTreeNode } from './PerspectiveTreeNode';
import _max from 'lodash/max';
import _range from 'lodash/max';
import _fill from 'lodash/fill';
import _findIndex from 'lodash/findIndex';
import debug from 'debug';

const dbg = debug('dbgate:PerspectiveDisplay');

const SKIP_CELL = {
  __perspective_skip_cell__: true,
};

let lastJoinId = 0;
function getJoinId(): number {
  lastJoinId += 1;
  return lastJoinId;
}

export class PerspectiveDisplayColumn {
  title: string;
  dataField: string;
  parentNodes: PerspectiveTreeNode[] = [];
  colSpanAtLevel = {};
  columnIndex = 0;
  dataNode: PerspectiveTreeNode = null;

  constructor(public display: PerspectiveDisplay) {}

  get rowSpan() {
    return this.display.columnLevelCount - this.parentNodes.length;
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
    return this.parentNodes.length;
  }

  getParentName(level) {
    return this.parentNodes[level]?.title;
  }

  // hasParentNode(node: PerspectiveTreeNode) {
  //   return this.parentNodes.includes(node);
  // }
}

interface PerspectiveSubRowCollection {
  rows: CollectedPerspectiveDisplayRow[];
}

interface CollectedPerspectiveDisplayRow {
  // startIndex = 0;
  columnIndexes: number[];
  rowData: any[];
  // rowSpans: number[] = null;
  subRowCollections: PerspectiveSubRowCollection[];
  incompleteRowsIndicator?: string[];
}

export class PerspectiveDisplayRow {
  constructor(public display: PerspectiveDisplay) {
    this.rowData = _fill(Array(display.columns.length), undefined);
    this.rowSpans = _fill(Array(display.columns.length), 1);
    this.rowJoinIds = _fill(Array(display.columns.length), 0);
  }

  getRow(rowIndex): PerspectiveDisplayRow {
    if (rowIndex == 0) return this;
    while (this.subrows.length < rowIndex) {
      this.subrows.push(new PerspectiveDisplayRow(this.display));
    }
    return this.subrows[rowIndex - 1];
  }

  setRowJoinId(col: number, joinId: number) {
    this.rowJoinIds[col] = joinId;
    for (const subrow of this.subrows) {
      subrow.setRowJoinId(col, joinId);
    }
  }

  subrows?: PerspectiveDisplayRow[] = [];

  rowData: any[] = [];
  rowSpans: number[] = null;
  rowJoinIds: number[] = [];
  incompleteRowsIndicator: string[] = null;
}

export class PerspectiveDisplay {
  columns: PerspectiveDisplayColumn[] = [];
  rows: PerspectiveDisplayRow[] = [];
  readonly columnLevelCount: number;

  constructor(public root: PerspectiveTreeNode, rows: any[]) {
    // dbg('source rows', rows);
    this.fillColumns(root.childNodes, [root]);
    if (this.columns.length > 0) {
      this.columns[0].colSpanAtLevel[0] = this.columns.length;
    }
    this.columnLevelCount = _max(this.columns.map(x => x.parentNodes.length)) + 1;
    const collectedRows = this.collectRows(rows, root.childNodes);
    // dbg('collected rows', collectedRows);
    // console.log('COLLECTED', collectedRows);
    // this.mergeRows(collectedRows);
    this.mergeRows(collectedRows);
    // dbg('merged rows', this.rows);

    // console.log(
    //   'MERGED',
    //   this.rows.map(r =>
    //     r.incompleteRowsIndicator
    //       ? `************************************ ${r.incompleteRowsIndicator.join('|')}`
    //       : r.rowData.join('|')
    //   )
    // );
  }

  fillColumns(children: PerspectiveTreeNode[], parentNodes: PerspectiveTreeNode[]) {
    for (const child of children) {
      if (child.isChecked) {
        this.processColumn(child, parentNodes);
      }
    }
  }

  processColumn(node: PerspectiveTreeNode, parentNodes: PerspectiveTreeNode[]) {
    if (node.isExpandable) {
      const countBefore = this.columns.length;
      this.fillColumns(node.childNodes, [...parentNodes, node]);

      if (this.columns.length > countBefore) {
        this.columns[countBefore].colSpanAtLevel[parentNodes.length] = this.columns.length - countBefore;
      }
    } else {
      const column = new PerspectiveDisplayColumn(this);
      column.title = node.columnTitle;
      column.dataField = node.dataField;
      column.parentNodes = parentNodes;
      column.display = this;
      column.columnIndex = this.columns.length;
      column.dataNode = node;
      this.columns.push(column);
    }
  }

  findColumnIndexFromNode(node: PerspectiveTreeNode) {
    return _findIndex(this.columns, x => x.dataNode.uniqueName == node.uniqueName);
  }

  collectRows(sourceRows: any[], nodes: PerspectiveTreeNode[]): CollectedPerspectiveDisplayRow[] {
    const columnNodes = nodes.filter(x => x.isChecked && !x.isExpandable);
    const treeNodes = nodes.filter(x => x.isChecked && x.isExpandable);

    const columnIndexes = columnNodes.map(node => this.findColumnIndexFromNode(node));

    const res: CollectedPerspectiveDisplayRow[] = [];
    for (const sourceRow of sourceRows) {
      // console.log('PROCESS SOURCE', sourceRow);
      // row.startIndex = startIndex;
      const rowData = columnNodes.map(node => sourceRow[node.codeName]);
      const subRowCollections = [];

      for (const node of treeNodes) {
        if (sourceRow[node.fieldName]) {
          const subrows = {
            rows: this.collectRows(sourceRow[node.fieldName], node.childNodes),
          };
          subRowCollections.push(subrows);
        }
      }

      res.push({
        rowData,
        columnIndexes,
        subRowCollections,
        incompleteRowsIndicator: sourceRow.incompleteRowsIndicator,
      });
    }

    return res;
  }

  flushFlatRows(row: PerspectiveDisplayRow) {
    this.rows.push(row);
    for (const child of row.subrows) {
      this.flushFlatRows(child);
    }
  }

  fillRowSpans() {
    for (let col = 0; col < this.columns.length; col++) {
      // let lastFilledJoinId = null;
      let lastFilledRow = 0;
      let rowIndex = 0;

      for (const row of this.rows) {
        if (
          row.rowData[col] === undefined &&
          row.rowJoinIds[col] == this.rows[lastFilledRow].rowJoinIds[col] &&
          row.rowJoinIds[col]
        ) {
          row.rowData[col] = SKIP_CELL;
          this.rows[lastFilledRow].rowSpans[col] = rowIndex - lastFilledRow + 1;
        } else {
          lastFilledRow = rowIndex;
        }
        rowIndex++;
      }
    }
  }

  mergeRows(collectedRows: CollectedPerspectiveDisplayRow[]) {
    const rows = [];
    for (const collectedRow of collectedRows) {
      const resultRow = new PerspectiveDisplayRow(this);
      this.mergeRow(collectedRow, resultRow);
      rows.push(resultRow);
    }
    for (const row of rows) {
      this.flushFlatRows(row);
    }
    for (const row of this.rows) {
      delete row.subrows;
    }
    this.fillRowSpans();
  }

  mergeRow(collectedRow: CollectedPerspectiveDisplayRow, resultRow: PerspectiveDisplayRow) {
    for (let i = 0; i < collectedRow.columnIndexes.length; i++) {
      resultRow.rowData[collectedRow.columnIndexes[i]] = collectedRow.rowData[i];
    }
    resultRow.incompleteRowsIndicator = collectedRow.incompleteRowsIndicator;

    let subRowCount = 0;
    for (const subrows of collectedRow.subRowCollections) {
      let rowIndex = 0;
      for (const subrow of subrows.rows) {
        const targetRow = resultRow.getRow(rowIndex);
        this.mergeRow(subrow, targetRow);
        rowIndex++;
      }
      if (rowIndex > subRowCount) {
        subRowCount = rowIndex;
      }
    }

    const joinId = getJoinId();
    for (let i = 0; i < collectedRow.columnIndexes.length; i++) {
      resultRow.setRowJoinId(collectedRow.columnIndexes[i], joinId);
    }

    // for (let ri = 0; ri < subRowCount; ri++) {
    //   const targetRow = resultRow.getRow(ri);
    //   for (let i = 0; i < collectedRow.columnIndexes.length; i++) {
    //     targetRow.rowJoinIds[collectedRow.columnIndexes[i]] = joinId;
    //   }
    // }
  }
}
