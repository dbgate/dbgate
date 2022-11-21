import _ from 'lodash';
import { SeriesSizes } from './SeriesSizes';
import type { CellAddress } from './selection';
import type { GridDisplay } from 'dbgate-datalib';
import type Grider from './Grider';
import { isJsonLikeLongString, safeJsonParse } from 'dbgate-tools';

export function countColumnSizes(grider: Grider, columns, containerWidth, display: GridDisplay) {
  // console.log('COUNT SIZES');

  const columnSizes = new SeriesSizes();
  if (!grider || !columns || !display) return columnSizes;

  let canvas = document.createElement('canvas');
  let context = canvas.getContext('2d');

  //return this.context.measureText(txt).width;

  // console.log('countColumnSizes', loadedRows.length, containerWidth);
  // console.log('countColumnSizes:columns', columns);

  columnSizes.maxSize = (containerWidth * 2) / 3;
  columnSizes.count = columns.length;

  // columnSizes.setExtraordinaryIndexes(this.getHiddenColumnIndexes(), this.getFrozenColumnIndexes());
  // console.log('display.hiddenColumnIndexes', display.hiddenColumnIndexes)

  columnSizes.setExtraordinaryIndexes(display.hiddenColumnIndexes, []);

  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    //this.columnSizes.PutSizeOverride(col, this.columns[col].Name.length * 8);
    const column = columns[colIndex];

    if (display.config.columnWidths[column.uniqueName]) {
      columnSizes.putSizeOverride(colIndex, display.config.columnWidths[column.uniqueName]);
      continue;
    }

    // if (column.columnClientObject != null && column.columnClientObject.notNull) context.font = "bold 14px Helvetica";
    // else context.font = "14px Helvetica";
    context.font = 'bold 14px Helvetica';

    const text = column.headerText;
    const headerWidth = context.measureText(text).width + 64;

    // if (column.columnClientObject != null && column.columnClientObject.icon != null) headerWidth += 16;
    // if (this.getFilterOnColumn(column.uniquePath)) headerWidth += 16;
    // if (this.getSortOrder(column.uniquePath)) headerWidth += 16;

    columnSizes.putSizeOverride(colIndex, headerWidth);
  }

  // let headerWidth = this.rowHeaderWidthDefault;
  // if (this.rowCount) headerWidth = context.measureText(this.rowCount.toString()).width + 8;
  // this.rowHeaderWidth = this.rowHeaderWidthDefault;
  // if (headerWidth > this.rowHeaderWidth) this.rowHeaderWidth = headerWidth;

  context.font = '14px Helvetica';
  for (let rowIndex = 0; rowIndex < Math.min(grider.rowCount, 20); rowIndex += 1) {
    const row = grider.getRowData(rowIndex);
    if (!row) {
      continue;
    }
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      const uqName = columns[colIndex].uniqueName;

      if (display.config.columnWidths[uqName]) {
        continue;
      }

      const value = row[uqName];
      let text = value;
      if (_.isArray(value)) text = `[${value.length} items]`;
      else if (value?.$oid) text = `ObjectId("${value.$oid}")`;
      else if (isJsonLikeLongString(value) && safeJsonParse(value)) text = '(JSON)';
      const width = context.measureText(text).width + 8;
      // console.log('colName', colName, text, width);
      columnSizes.putSizeOverride(colIndex, width);
      // let colName = this.columns[colIndex].uniquePath;
      // let text: string = row[colName].gridText;
      // let width = context.measureText(text).width + 8;
      // if (row[colName].dataPrefix) width += context.measureText(row[colName].dataPrefix).width + 3;
      // this.columnSizes.putSizeOverride(colIndex, width);
    }
  }

  // for (let modelIndex = 0; modelIndex < this.columns.length; modelIndex++) {
  //     let width = getHashValue(this.widthHashPrefix + this.columns[modelIndex].uniquePath);
  //     if (width) this.columnSizes.putSizeOverride(modelIndex, _.toNumber(width), true);
  // }

  columnSizes.buildIndex();
  return columnSizes;
}

export function countVisibleRealColumns(columnSizes, firstVisibleColumnScrollIndex, gridScrollAreaWidth, columns) {
  const visibleColumnCount = columnSizes.getVisibleScrollCount(firstVisibleColumnScrollIndex, gridScrollAreaWidth);
  // console.log('visibleColumnCount', visibleColumnCount);
  // console.log('gridScrollAreaWidth', gridScrollAreaWidth);

  const visibleRealColumnIndexes = [];
  const modelIndexes = {};
  /** @type {(import('dbgate-datalib').DisplayColumn & {width: number; colIndex: number})[]} */
  const realColumns = [];

  // frozen columns
  for (let colIndex = 0; colIndex < columnSizes.frozenCount; colIndex++) {
    visibleRealColumnIndexes.push(colIndex);
  }
  // scroll columns
  for (
    let colIndex = firstVisibleColumnScrollIndex;
    colIndex < firstVisibleColumnScrollIndex + visibleColumnCount;
    colIndex++
  ) {
    visibleRealColumnIndexes.push(colIndex + columnSizes.frozenCount);
  }
  // console.log('countVisibleRealColumns:visibleRealColumnIndexes', visibleRealColumnIndexes);

  // real columns
  for (let colIndex of visibleRealColumnIndexes) {
    let modelColumnIndex = columnSizes.realToModel(colIndex);
    // console.log('countVisibleRealColumns:modelColumnIndex', modelColumnIndex);
    modelIndexes[colIndex] = modelColumnIndex;

    let col = columns[modelColumnIndex];
    if (!col) continue;
    const width = columnSizes.getSizeByRealIndex(colIndex);
    realColumns.push({
      ...col,
      colIndex,
      width,
    });
  }
  // console.log('countVisibleRealColumns:realColumns', realColumns);
  return realColumns;
}

export function filterCellForRow(cell, row: number): CellAddress | null {
  return cell && (cell[0] == row || _.isString(cell[0])) ? cell : null;
}

export function filterCellsForRow(cells, row: number): CellAddress[] | null {
  const res = (cells || []).filter(x => x[0] == row || _.isString(x[0]));
  return res.length > 0 ? res : null;
}

export function cellIsSelected(row, col, selectedCells) {
  if (!selectedCells) return false;
  for (const [selectedRow, selectedCol] of selectedCells) {
    if (row == selectedRow && col == selectedCol) return true;
    if (selectedRow == 'header' && col == selectedCol) return true;
    if (row == selectedRow && selectedCol == 'header') return true;
    if (selectedRow == 'header' && selectedCol == 'header') return true;
  }
  return false;
}
