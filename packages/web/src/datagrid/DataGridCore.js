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
import InplaceEditor from './InplaceEditor';
import DataGridRow from './DataGridRow';
import { countColumnSizes, countVisibleRealColumns } from './gridutil';
import useModalState from '../modals/useModalState';
import ConfirmSqlModal from '../modals/ConfirmSqlModal';
import { changeSetToSql } from '@dbgate/datalib';
import { scriptToSql } from '@dbgate/sqltree';

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
const wheelRowCount = 5;

/** @param props {import('./types').DataGridProps} */
export default function DataGridCore(props) {
  const { conid, database, display, changeSet, setChangeSet, tabVisible } = props;
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
  const [shiftDragStartCell, setShiftDragStartCell] = React.useState(nullCell);

  const [inplaceEditorCell, setInplaceEditorCell] = React.useState(nullCell);
  const [inplaceEditorInitText, setInplaceEditorInitText] = React.useState('');

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
  const confirmSqlModalState = useModalState();
  const [confirmSql, setConfirmSql] = React.useState('');

  const columnSizes = React.useMemo(() => countColumnSizes(loadedRows, columns, containerWidth, display), [
    loadedRows,
    columns,
    containerWidth,
    display,
  ]);
  const headerColWidth = 40;

  // console.log('containerWidth', containerWidth);

  const gridScrollAreaHeight = containerHeight - 2 * rowHeight;
  const gridScrollAreaWidth = containerWidth - columnSizes.frozenSize - headerColWidth - 32;

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

  const handleCloseInplaceEditor = React.useCallback(() => {
    setInplaceEditorCell(null);
    setInplaceEditorInitText(null);
  }, []);

  const visibleRealColumns = React.useMemo(
    () => countVisibleRealColumns(columnSizes, firstVisibleColumnScrollIndex, gridScrollAreaWidth, columns),
    [columnSizes, firstVisibleColumnScrollIndex, gridScrollAreaWidth, columns]
  );

  const cellIsSelected = React.useCallback(
    (row, col) => {
      const [currentRow, currentCol] = currentCell;
      if (row == currentRow && col == currentCol) return true;
      for (const [selectedRow, selectedCol] of selectedCells) {
        if (row == selectedRow && col == selectedCol) return true;
        if (selectedRow == 'header' && col == selectedCol) return true;
        if (row == selectedRow && selectedCol == 'header') return true;
        if (selectedRow == 'header' && selectedCol == 'header') return true;
      }
      return false;
    },
    [currentCell, selectedCells]
  );

  if (!loadedRows || !columns) return null;
  const rowCountNewIncluded = loadedRows.length;

  const handleRowScroll = value => {
    setFirstVisibleRowScrollIndex(value);
  };

  const handleColumnScroll = value => {
    setFirstVisibleColumnScrollIndex(value);
  };

  function handleGridMouseDown(event) {
    event.target.closest('table').focus();
    const cell = cellFromEvent(event);
    setCurrentCell(cell);
    setSelectedCells(getCellRange(cell, cell));
    setDragStartCell(cell);

    if (isRegularCell(cell) && !_.isEqual(cell, inplaceEditorCell) && _.isEqual(cell, currentCell)) {
      setInplaceEditorCell(cell);
    } else if (!_.isEqual(cell, inplaceEditorCell)) {
      handleCloseInplaceEditor();
    }
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

  function handleGridWheel(event) {
    let newFirstVisibleRowScrollIndex = firstVisibleRowScrollIndex;
    if (event.deltaY > 0) {
      newFirstVisibleRowScrollIndex += wheelRowCount;
    }
    if (event.deltaY < 0) {
      newFirstVisibleRowScrollIndex -= wheelRowCount;
    }
    let rowCount = rowCountNewIncluded;
    if (newFirstVisibleRowScrollIndex + visibleRowCountLowerBound > rowCount) {
      newFirstVisibleRowScrollIndex = rowCount - visibleRowCountLowerBound + 1;
    }
    if (newFirstVisibleRowScrollIndex < 0) {
      newFirstVisibleRowScrollIndex = 0;
    }
    setFirstVisibleRowScrollIndex(newFirstVisibleRowScrollIndex);
    // @ts-ignore
    setvScrollValueToSet(newFirstVisibleRowScrollIndex);
    setvScrollValueToSetDate(new Date());
  }

  function handleSave() {
    const script = changeSetToSql(changeSet);
    const sql = scriptToSql(display.driver, script);
    setConfirmSql(sql);
    confirmSqlModalState.open();
  }

  function handleGridKeyDown(event) {
    if (
      !event.ctrlKey &&
      !event.altKey &&
      ((event.keyCode >= keycodes.a && event.keyCode <= keycodes.z) ||
        (event.keyCode >= keycodes.n0 && event.keyCode <= keycodes.n9) ||
        event.keyCode == keycodes.dash)
    ) {
      setInplaceEditorInitText(event.nativeEvent.key);
      setInplaceEditorCell(currentCell);
      // console.log('event', event.nativeEvent);
    }

    if (event.keyCode == keycodes.s && event.ctrlKey) {
      event.preventDefault();
      handleSave();
      // this.saveAndFocus();
    }

    const moved = handleCursorMove(event);

    if (moved) {
      if (event.shiftKey) {
        if (!isRegularCell(shiftDragStartCell)) {
          setShiftDragStartCell(currentCell);
        }
      } else {
        setShiftDragStartCell(nullCell);
      }
    }

    const newCell = handleCursorMove(event);
    if (event.shiftKey && newCell) {
      // @ts-ignore
      setSelectedCells(getCellRange(shiftDragStartCell, newCell));
    }
  }

  function handleCursorMove(event) {
    if (!isRegularCell(currentCell)) return null;
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
          return ['header', 'header'];
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
    return null;
  }

  function focusFilterEditor(columnRealIndex) {
    // let modelIndex = this.columnSizes.realToModel(columnRealIndex);
    // this.headerFilters[this.columns[modelIndex].uniquePath].focus();
    return ['filter', columnRealIndex];
  }

  function moveCurrentCell(row, col, event) {
    const rowCount = rowCountNewIncluded;

    if (row < 0) row = 0;
    if (row >= rowCount) row = rowCount - 1;
    if (col < 0) col = 0;
    if (col >= columnSizes.realCount) col = columnSizes.realCount - 1;
    setCurrentCell([row, col]);
    // setSelectedCells([...(event.ctrlKey ? selectedCells : []), [row, col]]);
    setSelectedCells([[row, col]]);
    scrollIntoView([row, col]);
    // this.selectedCells.push(this.currentCell);
    // this.scrollIntoView(this.currentCell);

    if (event) event.preventDefault();
    return [row, col];
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

  //   console.log('visibleRowCountUpperBound', visibleRowCountUpperBound);
  //   console.log('gridScrollAreaHeight', gridScrollAreaHeight);
  //   console.log('containerHeight', containerHeight);

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
        onWheel={handleGridWheel}
        // table can be focused
        tabIndex={-1}
        ref={tableRef}
      >
        <TableHead>
          <TableHeaderRow ref={headerRowRef}>
            <TableHeaderCell data-row="header" data-col="header" />
            {visibleRealColumns.map(col => (
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
            {visibleRealColumns.map(col => (
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
              <DataGridRow
                key={firstVisibleRowScrollIndex + index}
                rowIndex={firstVisibleRowScrollIndex + index}
                rowHeight={rowHeight}
                visibleRealColumns={visibleRealColumns}
                inplaceEditorCell={inplaceEditorCell}
                inplaceEditorInitText={inplaceEditorInitText}
                onCloseInplaceEditor={handleCloseInplaceEditor}
                cellIsSelected={cellIsSelected}
                changeSet={changeSet}
                setChangeSet={setChangeSet}
                display={display}
                row={row}
              />
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
      <ConfirmSqlModal modalState={confirmSqlModalState} sql={confirmSql} engine={display.engine} />
    </GridContainer>
  );
}
