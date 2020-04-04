import { SeriesSizes } from './SeriesSizes';
import { CellAddress } from './selection';

export function countColumnSizes(loadedRows, columns, containerWidth, display) {
  let canvas = document.createElement('canvas');
  let context = canvas.getContext('2d');

  //return this.context.measureText(txt).width;
  const columnSizes = new SeriesSizes();
  if (!loadedRows || !columns) return columnSizes;

  // console.log('countColumnSizes', loadedRows.length, containerWidth);

  columnSizes.maxSize = (containerWidth * 2) / 3;
  columnSizes.count = columns.length;

  // columnSizes.setExtraordinaryIndexes(this.getHiddenColumnIndexes(), this.getFrozenColumnIndexes());
  // console.log('display.hiddenColumnIndexes', display.hiddenColumnIndexes)

  columnSizes.setExtraordinaryIndexes(display.hiddenColumnIndexes, []);

  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    //this.columnSizes.PutSizeOverride(col, this.columns[col].Name.length * 8);
    const column = columns[colIndex];

    // if (column.columnClientObject != null && column.columnClientObject.notNull) context.font = "bold 14px Helvetica";
    // else context.font = "14px Helvetica";
    context.font = 'bold 14px Helvetica';

    let text = column.headerText;
    let headerWidth = context.measureText(text).width + 32;

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
  for (let row of loadedRows.slice(0, 20)) {
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      let uqName = columns[colIndex].uniqueName;
      let text = row[uqName];
      let width = context.measureText(text).width + 8;
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
  /** @type {(import('@dbgate/datalib').DisplayColumn & {widthPx: string; colIndex: number})[]} */
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

  // real columns
  for (let colIndex of visibleRealColumnIndexes) {
    let modelColumnIndex = columnSizes.realToModel(colIndex);
    modelIndexes[colIndex] = modelColumnIndex;

    let col = columns[modelColumnIndex];
    if (!col) continue;
    const widthNumber = columnSizes.getSizeByRealIndex(colIndex);
    realColumns.push({
      ...col,
      colIndex,
      widthPx: `${widthNumber}px`,
    });
  }
  return realColumns;
}

export function filterCellForRow(cell, row: number): CellAddress | null {
  return cell && cell[0] == row ? cell : null;
}

export function filterCellsForRow(cells, row: number): CellAddress[] | null {
  const res = (cells || []).filter(x => x[0] == row);
  return res.length > 0 ? res : null;
}
