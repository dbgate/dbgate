import moment from 'moment';
import _ from 'lodash';
import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import { HorizontalScrollBar, VerticalScrollBar } from './ScrollBars';
import useDimensions from '../utility/useDimensions';
import { SeriesSizes } from './SeriesSizes';
import axios from '../utility/axios';
import ColumnLabel from './ColumnLabel';
import DataFilterControl from './DataFilterControl';
import { getFilterType } from '@dbgate/filterparser';
import {
  convertCellAddress,
  cellFromEvent,
  getCellRange,
  topLeftCell,
  isRegularCell,
  nullCell,
  emptyCellArray,
} from './selection';
import keycodes from '../utility/keycodes';

const GridContainer = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  user-select: none;
`;

const Table = styled.table`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 20px;
  right: 20px;
  overflow: scroll;
  border-collapse: collapse;
  outline: none;
`;
const TableHead = styled.thead`
  // display: block;
  // width: 300px;
`;
const TableBody = styled.tbody`
  // display: block;
  // overflow: auto;
  // height: 100px;
`;
const TableHeaderRow = styled.tr`
  // height: 35px;
`;
const TableBodyRow = styled.tr`
  // height: 35px;
  background-color: #ffffff;
  &:nth-child(6n + 3) {
    background-color: #ebebeb;
  }
  &:nth-child(6n + 6) {
    background-color: #ebf5ff;
  }
`;
const TableHeaderCell = styled.td`
  // font-weight: bold;
  border: 1px solid #c0c0c0;
  // border-collapse: collapse;
  text-align: left;
  padding: 2px;
  background-color: #f6f7f9;
  overflow: hidden;
`;
const TableFilterCell = styled.td`
  text-align: left;
  overflow: hidden;
  margin: 0;
  padding: 0;
`;
const TableBodyCell = styled.td`
  font-weight: normal;
  border: 1px solid #c0c0c0;
  // border-collapse: collapse;
  padding: 2px;
  white-space: nowrap;
  overflow: hidden;
  ${props =>
    // @ts-ignore
    props.isSelected &&
    `
    background: initial;
    background-color: deepskyblue;
    color: white;`}
`;
const HintSpan = styled.span`
  color: gray;
  margin-left: 5px;
`;
const NullSpan = styled.span`
  color: gray;
  font-style: italic;
`;

function CellFormattedValue({ value }) {
  if (value == null) return <NullSpan>(NULL)</NullSpan>;
  if (_.isDate(value)) return moment(value).format('YYYY-MM-DD HH:mm:ss');
  return value;
}

/** @param props {import('./types').DataGridProps} */
export default function DataGridCore(props) {
  const { conid, database, display, tabVisible } = props;
  const columns = display.getGridColumns();

  // console.log(`GRID, conid=${conid}, database=${database}, sql=${sql}`);
  const [loadProps, setLoadProps] = React.useState({
    isLoading: false,
    loadedRows: [],
    isLoadedAll: false,
    loadedTime: new Date().getTime(),
  });
  const { isLoading, loadedRows, isLoadedAll, loadedTime } = loadProps;

  const loadedTimeRef = React.useRef(0);

  const [vScrollValueToSet, setvScrollValueToSet] = React.useState();
  const [vScrollValueToSetDate, setvScrollValueToSetDate] = React.useState(new Date());

  const [hScrollValueToSet, sethScrollValueToSet] = React.useState();
  const [hScrollValueToSetDate, sethScrollValueToSetDate] = React.useState(new Date());

  const [currentCell, setCurrentCell] = React.useState(topLeftCell);
  const [selectedCells, setSelectedCells] = React.useState(emptyCellArray);
  const [dragStartCell, setDragStartCell] = React.useState(nullCell);

  const loadNextData = async () => {
    if (isLoading) return;
    setLoadProps({
      ...loadProps,
      isLoading: true,
    });
    const loadStart = new Date().getTime();
    loadedTimeRef.current = loadStart;

    const sql = display.getPageQuery(loadedRows.length, 100);

    let response = await axios.request({
      url: 'database-connections/query-data',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: { sql },
    });
    if (loadedTimeRef.current !== loadStart) {
      // new load was dispatched
      return;
    }
    // if (!_.isArray(nextRows)) {
    //   console.log('Error loading data from server', nextRows);
    //   nextRows = [];
    // }
    const { rows: nextRows } = response.data;
    // console.log('nextRows', nextRows);
    const loadedInfo = {
      loadedRows: [...loadedRows, ...nextRows],
      loadedTime,
      isLoadedAll: nextRows.length === 0,
    };
    setLoadProps({
      ...loadProps,
      isLoading: false,
      ...loadedInfo,
    });
  };

  // const data = useFetch({
  //   url: 'database-connections/query-data',
  //   method: 'post',
  //   params: {
  //     conid,
  //     database,
  //   },
  //   data: { sql },
  // });
  // const { rows, columns } = data || {};
  const [firstVisibleRowScrollIndex, setFirstVisibleRowScrollIndex] = React.useState(0);
  const [firstVisibleColumnScrollIndex, setFirstVisibleColumnScrollIndex] = React.useState(0);

  const [headerRowRef, { height: rowHeight }] = useDimensions();
  const [tableBodyRef] = useDimensions();
  const [containerRef, { height: containerHeight, width: containerWidth }] = useDimensions();
  const [tableRef, { height: tableHeight, width: tableWidth }, tableElement] = useDimensions();

  const columnSizes = React.useMemo(() => countColumnSizes(), [loadedRows, containerWidth, display]);
  const headerColWidth = 40;

  // console.log('containerWidth', containerWidth);

  const gridScrollAreaHeight = containerHeight - 2 * rowHeight;
  const gridScrollAreaWidth = containerWidth - columnSizes.frozenSize - headerColWidth;

  const visibleRowCountUpperBound = Math.ceil(gridScrollAreaHeight / Math.floor(rowHeight));
  const visibleRowCountLowerBound = Math.floor(gridScrollAreaHeight / Math.ceil(rowHeight));
  //   const visibleRowCountUpperBound = 20;
  //   const visibleRowCountLowerBound = 20;
  // console.log('containerHeight', containerHeight);
  // console.log('visibleRowCountUpperBound', visibleRowCountUpperBound);
  // console.log('rowHeight', rowHeight);

  const reload = () => {
    setLoadProps({
      isLoading: false,
      loadedRows: [],
      isLoadedAll: false,
      loadedTime: new Date().getTime(),
    });
  };

  React.useEffect(() => {
    if (!isLoadedAll && firstVisibleRowScrollIndex + visibleRowCountUpperBound >= loadedRows.length) {
      const sql = display.getPageQuery(0, 1);
      // try to get SQL, if success, load page. If not, callbacks to load missing metadata are dispatched
      if (sql) loadNextData();
    }
    if (display.cache.refreshTime > loadedTime) {
      reload();
    }
  });

  React.useEffect(() => {
    if (tabVisible) {
      // @ts-ignore
      if (tableElement) tableElement.focus();
    }
  }, [tabVisible, tableElement]);

  if (!loadedRows || !columns) return null;
  const rowCountNewIncluded = loadedRows.length;

  const handleRowScroll = value => {
    setFirstVisibleRowScrollIndex(value);
  };

  const handleColumnScroll = value => {
    setFirstVisibleColumnScrollIndex(value);
  };

  function countColumnSizes() {
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

  function handleGridMouseDown(event) {
    event.target.closest('table').focus();
    const cell = cellFromEvent(event);
    setCurrentCell(cell);
    setSelectedCells(getCellRange(cell, cell));
    setDragStartCell(cell);
    // console.log('START', cell);
  }

  function handleGridMouseMove(event) {
    if (dragStartCell) {
      const cell = cellFromEvent(event);
      setCurrentCell(cell);
      setSelectedCells(getCellRange(dragStartCell, cell));
    }
  }

  function handleGridMouseUp(event) {
    if (dragStartCell) {
      const cell = cellFromEvent(event);
      setCurrentCell(cell);
      setSelectedCells(getCellRange(dragStartCell, cell));
      setDragStartCell(null);
    }
  }

  function handleGridKeyDown(event) {
    handleCursorMove(event);
  }

  function handleCursorMove(event) {
    if (!isRegularCell(currentCell)) return false;
    let rowCount = rowCountNewIncluded;
    if (event.ctrlKey) {
      switch (event.keyCode) {
        case keycodes.upArrow:
        case keycodes.pageUp:
          return moveCurrentCell(0, currentCell[1], event);
        case keycodes.downArrow:
        case keycodes.pageDown:
          return moveCurrentCell(rowCount - 1, currentCell[1], event);
        case keycodes.leftArrow:
          return moveCurrentCell(currentCell[0], 0, event);
        case keycodes.rightArrow:
          return moveCurrentCell(currentCell[0], columnSizes.realCount - 1, event);
        case keycodes.home:
          return moveCurrentCell(0, 0, event);
        case keycodes.end:
          return moveCurrentCell(rowCount - 1, columnSizes.realCount - 1, event);
        case keycodes.a:
          setSelectedCells([['header', 'header']]);
          event.preventDefault();
          return true;
      }
    } else {
      switch (event.keyCode) {
        case keycodes.upArrow:
          if (currentCell[0] == 0) return focusFilterEditor(currentCell[1]);
          return moveCurrentCell(currentCell[0] - 1, currentCell[1], event);
        case keycodes.downArrow:
        case keycodes.enter:
          return moveCurrentCell(currentCell[0] + 1, currentCell[1], event);
        case keycodes.leftArrow:
          return moveCurrentCell(currentCell[0], currentCell[1] - 1, event);
        case keycodes.rightArrow:
          return moveCurrentCell(currentCell[0], currentCell[1] + 1, event);
        case keycodes.home:
          return moveCurrentCell(currentCell[0], 0, event);
        case keycodes.end:
          return moveCurrentCell(currentCell[0], columnSizes.realCount - 1, event);
        case keycodes.pageUp:
          return moveCurrentCell(currentCell[0] - visibleRowCountLowerBound, currentCell[1], event);
        case keycodes.pageDown:
          return moveCurrentCell(currentCell[0] + visibleRowCountLowerBound, currentCell[1], event);
      }
    }
    return false;
  }

  function focusFilterEditor(columnRealIndex) {
    // let modelIndex = this.columnSizes.realToModel(columnRealIndex);
    // this.headerFilters[this.columns[modelIndex].uniquePath].focus();
    return true;
  }

  function moveCurrentCell(row, col, event) {
    let rowCount = rowCountNewIncluded;

    if (row < 0) row = 0;
    if (row >= rowCount) row = rowCount - 1;
    if (col < 0) col = 0;
    if (col >= columnSizes.realCount) col = columnSizes.realCount - 1;
    setCurrentCell([row, col]);
    setSelectedCells([...(event.ctrlKey ? selectedCells : []), [row, col]]);
    scrollIntoView([row, col]);
    // this.selectedCells.push(this.currentCell);
    // this.scrollIntoView(this.currentCell);

    if (event) event.preventDefault();
    return true;
  }

  function scrollIntoView(cell) {
    const [row, col] = cell;

    if (row != null) {
      let newRow = null;
      const rowCount = rowCountNewIncluded;

      if (row < firstVisibleRowScrollIndex) newRow = row;
      else if (row + 1 >= firstVisibleRowScrollIndex + visibleRowCountLowerBound)
        newRow = row - visibleRowCountLowerBound + 2;

      if (newRow < 0) newRow = 0;
      if (newRow >= rowCount) newRow = rowCount - 1;

      if (newRow != null) {
        setFirstVisibleRowScrollIndex(newRow);
        // firstVisibleRowScrollIndex = newRow;
        setvScrollValueToSet(newRow);
        setvScrollValueToSetDate(new Date());
        // vscroll.value = newRow;
      }
      //int newRow = _rowSizes.ScrollInView(FirstVisibleRowScrollIndex, cell.Row.Value - _rowSizes.FrozenCount, GridScrollAreaHeight);
      //ScrollContent(newRow, FirstVisibleColumnScrollIndex);
    }

    if (col != null) {
      if (col >= columnSizes.frozenCount) {
        let newColumn = columnSizes.scrollInView(
          firstVisibleColumnScrollIndex,
          col - columnSizes.frozenCount,
          gridScrollAreaWidth
        );
        setFirstVisibleColumnScrollIndex(newColumn);

        // @ts-ignore
        sethScrollValueToSet(newColumn);
        sethScrollValueToSetDate(new Date());

        // firstVisibleColumnScrollIndex = newColumn;
        // hscroll.value = newColumn;
      }
    }
  }

  function cellIsSelected(row, col) {
    const [currentRow, currentCol] = currentCell;
    if (row == currentRow && col == currentCol) return true;
    for (const [selectedRow, selectedCol] of selectedCells) {
      if (row == selectedRow && col == selectedCol) return true;
      if (selectedRow == 'header' && col == selectedCol) return true;
      if (row == selectedRow && selectedCol == 'header') return true;
      if (selectedRow == 'header' && selectedCol == 'header') return true;
    }
    return false;
  }

  //   console.log('visibleRowCountUpperBound', visibleRowCountUpperBound);
  //   console.log('gridScrollAreaHeight', gridScrollAreaHeight);
  //   console.log('containerHeight', containerHeight);

  const visibleColumnCount = columnSizes.getVisibleScrollCount(firstVisibleColumnScrollIndex, gridScrollAreaWidth);
  console.log('visibleColumnCount', visibleColumnCount);
  console.log('gridScrollAreaWidth', gridScrollAreaWidth);

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

  const hederColwidthPx = `${headerColWidth}px`;
  const filterCount = display.filterCount;

  const handleClearFilters = () => {
    display.clearFilters();
  };

  // console.log('visibleRealColumnIndexes', visibleRealColumnIndexes);
  console.log(
    'gridScrollAreaWidth / columnSizes.getVisibleScrollSizeSum()',
    gridScrollAreaWidth,
    columnSizes.getVisibleScrollSizeSum()
  );

  return (
    <GridContainer ref={containerRef}>
      <Table
        onMouseDown={handleGridMouseDown}
        onMouseMove={handleGridMouseMove}
        onMouseUp={handleGridMouseUp}
        onKeyDown={handleGridKeyDown}
        // table can be focused
        tabIndex={-1}
        ref={tableRef}
      >
        <TableHead>
          <TableHeaderRow ref={headerRowRef}>
            <TableHeaderCell data-row="header" data-col="header" />
            {realColumns.map(col => (
              <TableHeaderCell
                data-row="header"
                data-col={col.colIndex}
                key={col.uniqueName}
                style={{ width: col.widthPx, minWidth: col.widthPx, maxWidth: col.widthPx }}
              >
                <ColumnLabel {...col} />
              </TableHeaderCell>
            ))}
          </TableHeaderRow>
          <TableHeaderRow>
            <TableHeaderCell
              style={{ width: hederColwidthPx, minWidth: hederColwidthPx, maxWidth: hederColwidthPx }}
              data-row="filter"
              data-col="header"
            >
              {filterCount > 0 && (
                <button onClick={handleClearFilters}>
                  <i className="fas fa-times" />
                </button>
              )}
            </TableHeaderCell>
            {realColumns.map(col => (
              <TableFilterCell
                key={col.uniqueName}
                style={{ width: col.widthPx, minWidth: col.widthPx, maxWidth: col.widthPx }}
                data-row="filter"
                data-col={col.colIndex}
              >
                <DataFilterControl
                  filterType={getFilterType(col.commonType ? col.commonType.typeCode : null)}
                  filter={display.getFilter(col.uniqueName)}
                  setFilter={value => display.setFilter(col.uniqueName, value)}
                />
              </TableFilterCell>
            ))}
          </TableHeaderRow>
        </TableHead>
        <TableBody ref={tableBodyRef}>
          {loadedRows
            .slice(firstVisibleRowScrollIndex, firstVisibleRowScrollIndex + visibleRowCountUpperBound)
            .map((row, index) => (
              <TableBodyRow key={firstVisibleRowScrollIndex + index} style={{ height: `${rowHeight}px` }}>
                <TableHeaderCell data-row={firstVisibleRowScrollIndex + index} data-col="header">
                  {firstVisibleRowScrollIndex + index + 1}
                </TableHeaderCell>
                {realColumns.map(col => (
                  <TableBodyCell
                    key={col.uniqueName}
                    style={{
                      width: col.widthPx,
                      minWidth: col.widthPx,
                      maxWidth: col.widthPx,
                    }}
                    data-row={firstVisibleRowScrollIndex + index}
                    data-col={col.colIndex}
                    // @ts-ignore
                    isSelected={cellIsSelected(firstVisibleRowScrollIndex + index, col.colIndex)}
                  >
                    <CellFormattedValue value={row[col.uniqueName]} />
                    {col.hintColumnName && <HintSpan>{row[col.hintColumnName]}</HintSpan>}
                  </TableBodyCell>
                ))}
              </TableBodyRow>
            ))}
        </TableBody>
      </Table>
      <HorizontalScrollBar
        valueToSet={hScrollValueToSet}
        valueToSetDate={hScrollValueToSetDate}
        minimum={0}
        maximum={columns.length - 1}
        viewportRatio={gridScrollAreaWidth / columnSizes.getVisibleScrollSizeSum()}
        onScroll={handleColumnScroll}
      />
      <VerticalScrollBar
        valueToSet={vScrollValueToSet}
        valueToSetDate={vScrollValueToSetDate}
        minimum={0}
        maximum={rowCountNewIncluded - visibleRowCountUpperBound + 2}
        onScroll={handleRowScroll}
        viewportRatio={visibleRowCountUpperBound / rowCountNewIncluded}
      />
    </GridContainer>
  );
}
