import { getTableChildPerspectiveNodes, PerspectiveTableNode, PerspectiveTreeNode } from './PerspectiveTreeNode';
import _max from 'lodash/max';
import _range from 'lodash/max';
import _fill from 'lodash/fill';
import _findIndex from 'lodash/findIndex';
import _isPlainObject from 'lodash/isPlainObject';
import _isArray from 'lodash/isArray';
import debug from 'debug';

const dbg = debug('dbgate:PerspectiveDisplay');

let lastJoinId = 0;
function getJoinId(): number {
  lastJoinId += 1;
  return lastJoinId;
}

export class PerspectiveDisplayColumn {
  title: string;
  dataField: string;
  displayType: string;
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

  getParentNode(level) {
    return this.parentNodes[level];
  }

  getParentTableDesignerId(level) {
    return this.parentNodes[level]?.headerTableAttributes ? this.parentNodes[level]?.designerId : '';
  }

  // hasParentNode(node: PerspectiveTreeNode) {
  //   return this.parentNodes.includes(node);
  // }
}

interface PerspectiveSubRowCollection {
  rows: CollectedPerspectiveDisplayRow[];
}

interface CollectedPerspectiveDisplayRow {
  columnIndexes: number[];
  rowData: any[];
  subRowCollections: PerspectiveSubRowCollection[];
  incompleteRowsIndicator?: string[];
}

export class PerspectiveDisplayRow {
  constructor(public display: PerspectiveDisplay) {
    this.rowData = _fill(Array(display.columns.length), undefined);
    this.rowSpans = _fill(Array(display.columns.length), 1);
    this.rowJoinIds = _fill(Array(display.columns.length), 0);
    this.rowCellSkips = _fill(Array(display.columns.length), false);
  }

  rowData: any[] = [];
  rowSpans: number[] = null;
  rowCellSkips: boolean[] = null;

  rowJoinIds: number[] = [];
}

export class PerspectiveDisplay {
  columns: PerspectiveDisplayColumn[] = [];
  rows: PerspectiveDisplayRow[] = [];
  readonly columnLevelCount: number;
  loadIndicatorsCounts: { [designerId: string]: number } = {};

  constructor(public root: PerspectiveTreeNode, rows: any[]) {
    // dbg('source rows', rows);
    this.fillColumns(root.childNodes, [root]);
    if (this.columns.length > 0) {
      this.columns[0].colSpanAtLevel[0] = this.columns.length;
    }
    this.columnLevelCount = _max(this.columns.map(x => x.parentNodes.length)) + 1;
    const collectedRows = this.collectRows(rows, root.childNodes);
    dbg('collected rows', collectedRows);
    // console.log('COLLECTED', JSON.stringify(collectedRows, null, 2));
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

  private getRowAt(rowIndex) {
    while (this.rows.length <= rowIndex) {
      this.rows.push(new PerspectiveDisplayRow(this));
    }
    return this.rows[rowIndex];
  }

  fillColumns(children: PerspectiveTreeNode[], parentNodes: PerspectiveTreeNode[]) {
    for (const child of children) {
      if (child.generatesHiearchicGridColumn || child.generatesDataGridColumn) {
        this.processColumn(child, parentNodes);
      }
    }
  }

  processColumn(node: PerspectiveTreeNode, parentNodes: PerspectiveTreeNode[]) {
    if (node.generatesDataGridColumn) {
      const column = new PerspectiveDisplayColumn(this);
      column.title = node.columnTitle;
      column.dataField = node.dataField;
      column.parentNodes = parentNodes;
      column.display = this;
      column.columnIndex = this.columns.length;
      column.dataNode = node;
      column.displayType = node.parentNodeConfig?.columnDisplays?.[node.columnName];
      this.columns.push(column);
    }

    if (node.generatesHiearchicGridColumn) {
      const countBefore = this.columns.length;
      this.fillColumns(node.childNodes, [...parentNodes, node]);

      if (this.columns.length > countBefore) {
        this.columns[countBefore].colSpanAtLevel[parentNodes.length] = this.columns.length - countBefore;
      }
    }
  }

  findColumnIndexFromNode(node: PerspectiveTreeNode) {
    return _findIndex(
      this.columns,
      x =>
        x.dataNode.columnName == node.columnName && x.dataNode?.parentNode?.designerId == node?.parentNode?.designerId
    );
  }

  // findColumnIndexFromNode(node: PerspectiveTreeNode) {
  //   return _findIndex(this.columns, x => x.dataNode.designerId == node.designerId);
  // }

  extractArray(value) {
    if (_isArray(value)) return value;
    if (_isPlainObject(value)) return [value];
    return [];
  }

  collectRows(sourceRows: any[], nodes: PerspectiveTreeNode[]): CollectedPerspectiveDisplayRow[] {
    // console.log('********** COLLECT ROWS', sourceRows);
    const columnNodes = nodes.filter(x => x.generatesDataGridColumn);
    const treeNodes = nodes.filter(x => x.generatesHiearchicGridColumn);

    // console.log(
    //   'columnNodes',
    //   columnNodes.map(x => x.title)
    // );
    // console.log(
    //   'treeNodes',
    //   treeNodes.map(x => x.title)
    // );

    // console.log(
    //   'nodes',
    //   nodes.map(x => x.title)
    // );

    const columnIndexes = columnNodes.map(node => this.findColumnIndexFromNode(node));

    const res: CollectedPerspectiveDisplayRow[] = [];
    for (const sourceRow of sourceRows) {
      // console.log('PROCESS SOURCE', sourceRow);
      // row.startIndex = startIndex;
      const rowData = columnNodes.map(node => sourceRow[node.columnName]);
      const subRowCollections = [];

      for (const node of treeNodes) {
        // console.log('sourceRow[node.fieldName]', node.fieldName, sourceRow[node.fieldName]);
        if (sourceRow[node.fieldName]) {
          const subrows = {
            rows: this.collectRows(this.extractArray(sourceRow[node.fieldName]), node.childNodes),
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
          row.rowCellSkips[col] = true;
          this.rows[lastFilledRow].rowSpans[col] = rowIndex - lastFilledRow + 1;
        } else {
          lastFilledRow = rowIndex;
        }
        rowIndex++;
      }
    }
  }

  mergeRows(collectedRows: CollectedPerspectiveDisplayRow[]) {
    let rowIndex = 0;
    for (const collectedRow of collectedRows) {
      const count = this.mergeRow(collectedRow, rowIndex);
      rowIndex += count;
    }
    this.fillRowSpans();
  }

  mergeRow(collectedRow: CollectedPerspectiveDisplayRow, rowIndex: number): number {
    if (collectedRow.incompleteRowsIndicator?.length > 0) {
      for (const indicator of collectedRow.incompleteRowsIndicator) {
        if (!this.loadIndicatorsCounts[indicator]) {
          this.loadIndicatorsCounts[indicator] = rowIndex;
        }
        if (rowIndex < this.loadIndicatorsCounts[indicator]) {
          this.loadIndicatorsCounts[indicator] = rowIndex;
        }
      }
      return 0;
    }

    const mainRow = this.getRowAt(rowIndex);
    for (let i = 0; i < collectedRow.columnIndexes.length; i++) {
      mainRow.rowData[collectedRow.columnIndexes[i]] = collectedRow.rowData[i];
    }

    let rowCount = 1;
    for (const subrows of collectedRow.subRowCollections) {
      let additionalRowCount = 0;
      let currentRowIndex = rowIndex;
      for (const subrow of subrows.rows) {
        const count = this.mergeRow(subrow, currentRowIndex);
        additionalRowCount += count;
        currentRowIndex += count;
      }
      if (additionalRowCount > rowCount) {
        rowCount = additionalRowCount;
      }
    }

    const joinId = getJoinId();
    for (let radd = 0; radd < rowCount; radd++) {
      const row = this.getRowAt(rowIndex + radd);
      for (let i = 0; i < collectedRow.columnIndexes.length; i++) {
        row.rowJoinIds[collectedRow.columnIndexes[i]] = joinId;
      }
    }

    return rowCount;
  }
}
