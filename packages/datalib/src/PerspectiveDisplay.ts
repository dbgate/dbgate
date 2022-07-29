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
    this.fillColumns(root.childNodes, []);
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

    // const nodeStartIndexes = new WeakMap();
    // for (const node of treeNodes) {
    //   const column = this.columns.find(x => x.hasParentNode(node));
    //   if (column) nodeStartIndexes.set(node, column.columnIndex);
    // }

    const res: CollectedPerspectiveDisplayRow[] = [];
    for (const sourceRow of sourceRows) {
      // console.log('PROCESS SOURCE', sourceRow);
      // row.startIndex = startIndex;
      const rowData = columnNodes.map(node => sourceRow[node.codeName]);
      const subRowCollections = [];

      for (const node of treeNodes) {
        // if (sourceRow.AlbumId == 1) {
        //   if (node.fieldName == 'ArtistIdRef') {
        //     console.log('XXX', sourceRow['ArtistIdRef']);
        //     console.log(require('lodash').keys(sourceRow))
        //     console.dir(sourceRow);
        //   }
        //   console.log(node.fieldName, sourceRow[node.fieldName], sourceRow);
        // }
        // console.log('sourceRow[node.fieldName]', sourceRow[node.fieldName]);
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

        //   ?.__perspective_joinId__ ||
        //   row.rowData[col]?.__perspective_joinId__ != lastFilledJoinId?.__perspective_joinId__
        // ) {
        //   console.log(row.rowData[col]);
        //   if (rowIndex - lastFilledRow > 1) {
        //     this.rows[lastFilledRow].rowSpans[col] = rowIndex - lastFilledRow;
        //   }
        //   lastFilledRow = rowIndex;
        //   lastFilledJoinId = row.rowData[col];
        //   // row.rowData[i] = undefined;
      }
    }
  }

  // simulate row after last row
  // if (rowIndex - lastFilledRow > 1) {
  //   console.log('S');
  //   this.rows[lastFilledRow].rowSpans[col] = rowIndex - lastFilledRow;
  // }
  // lastFilledRow = rowIndex;

  // const lastFilledColumns = _fill(Array(this.columns.length), 0);
  // const lastFilledColumnsJoinId = _fill(Array(this.columns.length), null);
  // let rowIndex = 0;
  // for (const row of this.rows) {
  //   for (let i = 0; i < this.columns.length; i++) {
  //     if (
  //       !row.rowData[i]?.__perspective_joinId__ ||
  //       row.rowData[i]?.__perspective_joinId__ != lastFilledColumnsJoinId[i]?.__perspective_joinId__
  //     ) {
  //       if (rowIndex - lastFilledColumns[i] > 1) {
  //         this.rows[lastFilledColumns[i]].rowSpans[i] = rowIndex - lastFilledColumns[i];
  //       }
  //       lastFilledColumns[i] = rowIndex;
  //       lastFilledColumnsJoinId[i] = row.rowData[i];
  //       // row.rowData[i] = undefined;
  //     }
  //   }
  //   rowIndex++;
  // }

  // // simulate row after last row
  // for (let i = 0; i < this.columns.length; i++) {
  //   if (rowIndex - lastFilledColumns[i] > 1) {
  //     this.rows[lastFilledColumns[i]].rowSpans[i] = rowIndex - lastFilledColumns[i];
  //   }
  //   lastFilledColumns[i] = rowIndex;
  // }
  // }

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
    for (let ri = 0; ri < subRowCount; ri++) {
      const targetRow = resultRow.getRow(ri);
      for (let i = 0; i < collectedRow.columnIndexes.length; i++) {
        targetRow.rowJoinIds[collectedRow.columnIndexes[i]] = joinId;
      }
    }
  }

  // rowToFlatRows(sourceRow: CollectedPerspectiveDisplayRow) {
  //   const res = [];

  //   const row = new PerspectiveDisplayRow(this);
  //   row.rowData = _fill(Array(this.columns.length), undefined);
  //   row.rowSpans = _fill(Array(this.columns.length), 1);
  //   res.push(row)

  //   for (let i = 0; i < sourceRow.columnIndexes.length; i++) {
  //     row.rowData[sourceRow.columnIndexes[i]] = sourceRow.rowData[i];
  //   }

  //   for(const subrows of sourceRow.subRowCollections) {
  //     let rowIndex=0;
  //     for(const subrow of subrows.rows) {
  //       if ()
  //       rowIndex++;

  //     }
  //   }

  //   return res;

  //   // while (true) {
  //   //   for (let colIndex = 0; colIndex < this.columns.length; colIndex++) {
  //   //     if (colIndex < sourceRow.startIndex) {
  //   //       continue;
  //   //     }
  //   //     if (colIndex < sourceRow.startIndex + sourceRow.rowData.length) {
  //   //       if (rowIndex == 0) {
  //   //         row.rowData[colIndex] = sourceRow.rowData[sourceRow.startIndex + colIndex];
  //   //         row.rowSpans[colIndex] = 1;
  //   //       } else {
  //   //         row.rowSpans[colIndex] += 1;
  //   //       }
  //   //     }
  //   //     const subrows = sourceRow.subRowCollections.find(x=>x.);
  //   //   }
  //   // }
  // }
}
