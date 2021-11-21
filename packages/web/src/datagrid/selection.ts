import _ from 'lodash';
export type CellAddress = [number | 'header' | 'filter' | undefined, number | 'header' | undefined];
export type RegularCellAddress = [number, number];

export const topLeftCell: CellAddress = [0, 0];
export const undefinedCell: CellAddress = [undefined, undefined];
export const nullCell: CellAddress = null;
export const emptyCellArray: CellAddress[] = [];

export function isRegularCell(cell: CellAddress): cell is RegularCellAddress {
  if (!cell) return false;
  const [row, col] = cell;
  return _.isNumber(row) && _.isNumber(col);
}

function normalizeHeaderForSelection(addr: CellAddress): CellAddress {
  if (addr[0] == 'filter') return ['header', addr[1]];
  return addr;
}

export function getCellRange(a: CellAddress, b: CellAddress): CellAddress[] {
  const [rowA, colA] = normalizeHeaderForSelection(a);
  const [rowB, colB] = normalizeHeaderForSelection(b);

  if (_.isNumber(rowA) && _.isNumber(colA) && _.isNumber(rowB) && _.isNumber(colB)) {
    const rowMin = Math.min(rowA, rowB);
    const rowMax = Math.max(rowA, rowB);
    const colMin = Math.min(colA, colB);
    const colMax = Math.max(colA, colB);
    const res = [];
    for (let row = rowMin; row <= rowMax; row++) {
      for (let col = colMin; col <= colMax; col++) {
        res.push([row, col]);
      }
    }
    return res;
  }
  if (rowA == 'header' && rowB == 'header' && _.isNumber(colA) && _.isNumber(colB)) {
    const colMin = Math.min(colA, colB);
    const colMax = Math.max(colA, colB);
    const res = [];
    for (let col = colMin; col <= colMax; col++) {
      res.push(['header', col]);
    }
    return res;
  }
  if (colA == 'header' && colB == 'header' && _.isNumber(rowA) && _.isNumber(rowB)) {
    const rowMin = Math.min(rowA, rowB);
    const rowMax = Math.max(rowA, rowB);
    const res = [];
    for (let row = rowMin; row <= rowMax; row++) {
      res.push([row, 'header']);
    }
    return res;
  }
  if (colA == 'header' && colB == 'header' && rowA == 'header' && rowB == 'header') {
    return [['header', 'header']];
  }
  return [];
}

export function convertCellAddress(row, col): CellAddress {
  const rowNumber = parseInt(row);
  const colNumber = parseInt(col);
  return [_.isNaN(rowNumber) ? row : rowNumber, _.isNaN(colNumber) ? col : colNumber];
}

export function cellFromEvent(event): CellAddress {
  const cell = event.target.closest('td');
  if (!cell) return undefinedCell;
  const col = cell.getAttribute('data-col');
  const row = cell.getAttribute('data-row');
  return convertCellAddress(row, col);
}
