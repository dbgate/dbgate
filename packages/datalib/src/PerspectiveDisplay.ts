import { PerspectiveTableNode, PerspectiveTreeNode } from './PerspectiveTreeNode';
import _max from 'lodash/max';
import _range from 'lodash/max';
import _fill from 'lodash/fill';
import _findIndex from 'lodash/findIndex';

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

class PerspectiveSubRowCollection {
  rows: CollectedPerspectiveDisplayRow[] = [];
  // startIndex = 0;
}

export class CollectedPerspectiveDisplayRow {
  // startIndex = 0;
  columnIndexes: number[] = [];
  rowData: any[] = [];
  // rowSpans: number[] = null;
  subRowCollections: PerspectiveSubRowCollection[] = [];
}

export class PerspectiveDisplayRow {
  constructor(public display: PerspectiveDisplay) {}

  rowData: any[] = [];
  rowSpans: number[] = null;
}

export class PerspectiveDisplay {
  columns: PerspectiveDisplayColumn[] = [];
  rows: PerspectiveDisplayRow[] = [];
  readonly columnLevelCount: number;

  constructor(public root: PerspectiveTreeNode, rows: any[]) {
    this.fillColumns(root.childNodes, []);
    this.columnLevelCount = _max(this.columns.map(x => x.parentNodes.length)) + 1;
    const collectedRows = this.collectRows(rows, root.childNodes);
    console.log('COLLECTED', collectedRows);
    // this.mergeRows(collectedRows);
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

    console.log(
      'columnNodes',
      columnNodes.map(x => x.fieldName)
    );

    const columnIndexes = columnNodes.map(node => this.findColumnIndexFromNode(node));

    // const nodeStartIndexes = new WeakMap();
    // for (const node of treeNodes) {
    //   const column = this.columns.find(x => x.hasParentNode(node));
    //   if (column) nodeStartIndexes.set(node, column.columnIndex);
    // }

    const res: CollectedPerspectiveDisplayRow[] = [];
    for (const sourceRow of sourceRows) {
      // console.log('PROCESS SOURCE', sourceRow);
      const row = new CollectedPerspectiveDisplayRow();
      // row.startIndex = startIndex;
      row.rowData = columnNodes.map(node => sourceRow[node.codeName]);
      row.columnIndexes = columnIndexes;

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
          const subrows = new PerspectiveSubRowCollection();
          // subrows.startIndex = nodeStartIndexes.get(node);
          subrows.rows = this.collectRows(sourceRow[node.fieldName], node.childNodes);
          row.subRowCollections.push(subrows);
        }
      }

      res.push(row);
    }

    return res;
  }

  // mergeRows(rows: PerspectiveDisplayRow[]) {}

  // flattenRows(sourceRow: CollectedPerspectiveDisplayRow) {
  //   let rowIndex = 0;
  //   const res = [];
  //   while (true) {
  //     const row = new PerspectiveDisplayRow(this);
  //     row.rowData = _fill(Array(this.columns.length), undefined);
  //     row.rowSpans = _fill(Array(this.columns.length), 0);
  //     for (let colIndex = 0; colIndex < this.columns.length; colIndex++) {
  //       if (colIndex < sourceRow.startIndex) {
  //         continue;
  //       }
  //       if (colIndex < sourceRow.startIndex + sourceRow.rowData.length) {
  //         if (rowIndex == 0) {
  //           row.rowData[colIndex] = sourceRow.rowData[sourceRow.startIndex + colIndex];
  //           row.rowSpans[colIndex] = 1;
  //         } else {
  //           row.rowSpans[colIndex] += 1;
  //         }
  //       }
  //       const subrows = sourceRow.subRowCollections.find(x=>x.);
  //     }
  //   }
  // }
}
