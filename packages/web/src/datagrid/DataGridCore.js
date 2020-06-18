import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { HorizontalScrollBar, VerticalScrollBar } from './ScrollBars';
import useDimensions from '../utility/useDimensions';
import axios from '../utility/axios';
import DataFilterControl from './DataFilterControl';
import { getFilterType } from '@dbgate/filterparser';
import { cellFromEvent, getCellRange, topLeftCell, isRegularCell, nullCell, emptyCellArray } from './selection';
import keycodes from '../utility/keycodes';
import DataGridRow from './DataGridRow';
import {
  countColumnSizes,
  countVisibleRealColumns,
  filterCellForRow,
  filterCellsForRow,
  cellIsSelected,
} from './gridutil';
import useModalState from '../modals/useModalState';
import ConfirmSqlModal from '../modals/ConfirmSqlModal';
import {
  changeSetToSql,
  createChangeSet,
  revertChangeSetRowChanges,
  getChangeSetInsertedRows,
  changeSetInsertNewRow,
  deleteChangeSetRows,
  batchUpdateChangeSet,
  setChangeSetValue,
  fullNameToString,
} from '@dbgate/datalib';
import { scriptToSql } from '@dbgate/sqltree';
import { copyTextToClipboard } from '../utility/clipboard';
import DataGridToolbar from './DataGridToolbar';
// import usePropsCompare from '../utility/usePropsCompare';
import ColumnHeaderControl from './ColumnHeaderControl';
import InlineButton from '../widgets/InlineButton';
import { showMenu } from '../modals/DropDownMenu';
import DataGridContextMenu from './DataGridContextMenu';
import useSocket from '../utility/SocketProvider';
import LoadingInfo from '../widgets/LoadingInfo';
import ErrorInfo from '../widgets/ErrorInfo';
import useShowModal from '../modals/showModal';
import ErrorMessageModal from '../modals/ErrorMessageModal';
import ImportExportModal from '../modals/ImportExportModal';

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
  padding: 0;
  // padding: 2px;
  margin: 0;
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
const FocusField = styled.input`
  // visibility: hidden
  position: absolute;
  left: -1000px;
  top: -1000px;
`;

const RowCountLabel = styled.div`
  position: absolute;
  background-color: lightgoldenrodyellow;
  right: 40px;
  bottom: 20px;
`;

const LoadingInfoWrapper = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
`;
const LoadingInfoBox = styled.div`
  background-color: #ccc;
  padding: 10px;
  border: 1px solid gray;
`;

/** @param props {import('./types').DataGridProps} */
async function loadDataPage(props, offset, limit) {
  const { display, conid, database, jslid } = props;

  if (jslid) {
    const response = await axios.request({
      url: 'jsldata/get-rows',
      method: 'get',
      params: {
        jslid,
        offset,
        limit,
      },
    });
    return response.data;
  }

  const sql = display.getPageQuery(offset, limit);

  const response = await axios.request({
    url: 'database-connections/query-data',
    method: 'post',
    params: {
      conid,
      database,
    },
    data: { sql },
  });

  if (response.data.errorMessage) return response.data;
  return response.data.rows;
}

function dataPageAvailable(props) {
  const { display, jslid } = props;
  if (jslid) return true;
  const sql = display.getPageQuery(0, 1);
  return !!sql;
}

/** @param props {import('./types').DataGridProps} */
async function loadRowCount(props) {
  const { display, conid, database, jslid } = props;

  if (jslid) {
    const response = await axios.request({
      url: 'jsldata/get-stats',
      method: 'get',
      params: {
        jslid,
      },
    });
    return response.data.rowCount;
  }

  const sql = display.getCountQuery();

  const response = await axios.request({
    url: 'database-connections/query-data',
    method: 'post',
    params: {
      conid,
      database,
    },
    data: { sql },
  });

  return parseInt(response.data.rows[0].count);
}

/** @param props {import('./types').DataGridProps} */
export default function DataGridCore(props) {
  const { conid, database, display, changeSetState, dispatchChangeSet, tabVisible, jslid } = props;
  // console.log('RENDER GRID', display.baseTable.pureName);
  const columns = React.useMemo(() => display.allColumns, [display]);

  // usePropsCompare(props);

  // console.log(`GRID, conid=${conid}, database=${database}, sql=${sql}`);
  const [loadProps, setLoadProps] = React.useState({
    isLoading: false,
    loadedRows: [],
    isLoadedAll: false,
    loadedTime: new Date().getTime(),
    allRowCount: null,
    errorMessage: null,
    jslStatsCounter: 0,
  });
  const { isLoading, loadedRows, isLoadedAll, loadedTime, allRowCount, errorMessage } = loadProps;

  const loadedTimeRef = React.useRef(0);
  const focusFieldRef = React.useRef();

  const [vScrollValueToSet, setvScrollValueToSet] = React.useState();
  const [vScrollValueToSetDate, setvScrollValueToSetDate] = React.useState(new Date());

  const [hScrollValueToSet, sethScrollValueToSet] = React.useState();
  const [hScrollValueToSetDate, sethScrollValueToSetDate] = React.useState(new Date());

  const [currentCell, setCurrentCell] = React.useState(topLeftCell);
  const [selectedCells, setSelectedCells] = React.useState([topLeftCell]);
  const [dragStartCell, setDragStartCell] = React.useState(nullCell);
  const [shiftDragStartCell, setShiftDragStartCell] = React.useState(nullCell);
  const [autofillDragStartCell, setAutofillDragStartCell] = React.useState(nullCell);
  const [autofillSelectedCells, setAutofillSelectedCells] = React.useState(emptyCellArray);

  // const [inplaceEditorCell, setInplaceEditorCell] = React.useState(nullCell);
  // const [inplaceEditorInitText, setInplaceEditorInitText] = React.useState('');
  // const [inplaceEditorShouldSave, setInplaceEditorShouldSave] = React.useState(false);
  // const [inplaceEditorChangedOnCreate, setInplaceEditorChangedOnCreate] = React.useState(false);

  const changeSet = changeSetState && changeSetState.value;
  const setChangeSet = React.useCallback((value) => dispatchChangeSet({ type: 'set', value }), [dispatchChangeSet]);

  const changeSetRef = React.useRef(changeSet);

  changeSetRef.current = changeSet;

  const autofillMarkerCell = React.useMemo(
    () =>
      selectedCells && selectedCells.length > 0 && _.uniq(selectedCells.map((x) => x[0])).length == 1
        ? [_.max(selectedCells.map((x) => x[0])), _.max(selectedCells.map((x) => x[1]))]
        : null,
    [selectedCells]
  );

  const showModal = useShowModal();

  const handleLoadRowCount = async () => {
    const rowCount = await loadRowCount(props);
    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      allRowCount: rowCount,
    }));
  };

  const loadNextData = async () => {
    if (isLoading) return;
    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      isLoading: true,
    }));
    const loadStart = new Date().getTime();
    loadedTimeRef.current = loadStart;

    const nextRows = await loadDataPage(props, loadedRows.length, 100);
    if (loadedTimeRef.current !== loadStart) {
      // new load was dispatched
      return;
    }
    // if (!_.isArray(nextRows)) {
    //   console.log('Error loading data from server', nextRows);
    //   nextRows = [];
    // }
    // console.log('nextRows', nextRows);
    if (nextRows.errorMessage) {
      setLoadProps((oldLoadProps) => ({
        ...oldLoadProps,
        isLoading: false,
        errorMessage: nextRows.errorMessage,
      }));
    } else {
      if (allRowCount == null) handleLoadRowCount();
      const loadedInfo = {
        loadedRows: [...loadedRows, ...nextRows],
        loadedTime,
      };
      setLoadProps((oldLoadProps) => ({
        ...oldLoadProps,
        isLoading: false,
        isLoadedAll: oldLoadProps.jslStatsCounter == loadProps.jslStatsCounter && nextRows.length === 0,
        ...loadedInfo,
      }));
    }
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
  const socket = useSocket();

  const [headerRowRef, { height: rowHeight }] = useDimensions();
  const [tableBodyRef] = useDimensions();
  const [containerRef, { height: containerHeight, width: containerWidth }] = useDimensions();
  // const [tableRef, { height: tableHeight, width: tableWidth }] = useDimensions();
  const confirmSqlModalState = useModalState();
  const [confirmSql, setConfirmSql] = React.useState('');

  const [inplaceEditorState, dispatchInsplaceEditor] = React.useReducer((state, action) => {
    switch (action.type) {
      case 'show':
        if (!display.editable) return {};
        return {
          cell: action.cell,
          text: action.text,
          selectAll: action.selectAll,
        };
      case 'close': {
        const [row, col] = currentCell || [];
        // @ts-ignore
        if (focusFieldRef.current) focusFieldRef.current.focus();
        // @ts-ignore
        if (action.mode == 'enter' && row) setTimeout(() => moveCurrentCell(row + 1, col), 0);
        if (action.mode == 'save') setTimeout(handleSave, 0);
        return {};
      }
      case 'shouldSave': {
        return {
          ...state,
          shouldSave: true,
        };
      }
    }
    return {};
  }, {});

  // usePropsCompare({ loadedRows, columns, containerWidth, display });

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
      allRowCount: null,
      isLoading: false,
      loadedRows: [],
      isLoadedAll: false,
      loadedTime: new Date().getTime(),
      errorMessage: null,
      jslStatsCounter: 0,
    });
  };

  const insertedRows = getChangeSetInsertedRows(changeSet, display.baseTable);

  const rowCountNewIncluded = loadedRows.length + insertedRows.length;

  React.useEffect(() => {
    if (
      !isLoadedAll &&
      !errorMessage &&
      firstVisibleRowScrollIndex + visibleRowCountUpperBound >= loadedRows.length &&
      insertedRows.length == 0
    ) {
      if (dataPageAvailable(props)) {
        // If not, callbacks to load missing metadata are dispatched
        loadNextData();
      }
    }
    if (props.masterLoadedTime && props.masterLoadedTime > loadedTime) {
      display.reload();
    }
    if (display.cache.refreshTime > loadedTime) {
      reload();
    }
  });

  React.useEffect(() => {
    if (tabVisible) {
      // @ts-ignore
      if (focusFieldRef.current) focusFieldRef.current.focus();
    }
  }, [tabVisible, focusFieldRef.current]);

  const maxScrollColumn = React.useMemo(() => {
    let newColumn = columnSizes.scrollInView(0, columns.length - 1 - columnSizes.frozenCount, gridScrollAreaWidth);
    return newColumn;
  }, [columnSizes, gridScrollAreaWidth]);

  const handleJslDataStats = React.useCallback((stats) => {
    setLoadProps((oldProps) => ({
      ...oldProps,
      allRowCount: stats.rowCount,
      isLoadedAll: false,
      jslStatsCounter: oldProps.jslStatsCounter + 1,
    }));
  }, []);

  React.useEffect(() => {
    if (jslid && socket) {
      socket.on(`jsldata-stats-${jslid}`, handleJslDataStats);
      return () => {
        socket.off(`jsldata-stats-${jslid}`, handleJslDataStats);
      };
    }
  }, [jslid]);

  React.useEffect(() => {
    if (props.onReferenceSourceChanged && ((loadedRows && loadedRows.length > 0) || isLoadedAll)) {
      props.onReferenceSourceChanged(getSelectedRowData(), loadedTime);
    }
  }, [selectedCells, props.refReloadToken, loadedRows && loadedRows[0]]);

  // const handleCloseInplaceEditor = React.useCallback(
  //   mode => {
  //     const [row, col] = currentCell || [];
  //     setInplaceEditorCell(null);
  //     setInplaceEditorInitText(null);
  //     setInplaceEditorShouldSave(false);
  //     if (tableElement) tableElement.focus();
  //     // @ts-ignore
  //     if (mode == 'enter' && row) moveCurrentCell(row + 1, col);
  //     if (mode == 'save') setTimeout(handleSave, 1);
  //   },
  //   [tableElement, currentCell]
  // );

  // usePropsCompare({ columnSizes, firstVisibleColumnScrollIndex, gridScrollAreaWidth, columns });

  const visibleRealColumns = React.useMemo(
    () => countVisibleRealColumns(columnSizes, firstVisibleColumnScrollIndex, gridScrollAreaWidth, columns),
    [columnSizes, firstVisibleColumnScrollIndex, gridScrollAreaWidth, columns]
  );

  const realColumnUniqueNames = React.useMemo(
    () =>
      _.range(columnSizes.realCount).map((realIndex) => (columns[columnSizes.realToModel(realIndex)] || {}).uniqueName),
    [columnSizes, columns]
  );

  React.useEffect(() => {
    if (display && display.focusedColumn) {
      const invMap = _.invert(realColumnUniqueNames);
      const colIndex = invMap[display.focusedColumn];
      if (colIndex) {
        scrollIntoView([null, colIndex]);
      }
    }
  }, [display && display.focusedColumn]);

  const rowCountInfo = React.useMemo(() => {
    if (selectedCells.length > 1 && selectedCells.every((x) => _.isNumber(x[0]) && _.isNumber(x[1]))) {
      let sum = _.sumBy(selectedCells, (cell) => {
        const row = loadedRows[cell[0]];
        if (row) {
          const colName = realColumnUniqueNames[cell[1]];
          if (colName) {
            const data = row[colName];
            if (!data) return 0;
            let num = +data;
            if (_.isNaN(num)) return 0;
            return num;
          }
        }
        return 0;
      });
      let count = selectedCells.length;
      let rowCount = getSelectedRowData().length;
      return `Rows: ${rowCount.toLocaleString()}, Count: ${count.toLocaleString()}, Sum:${sum.toLocaleString()}`;
    }
    if (allRowCount == null) return 'Loading row count...';
    return `Rows: ${allRowCount.toLocaleString()}`;
    // if (this.isLoadingFirstPage) return "Loading first page...";
    // if (this.isFirstPageError) return "Error loading first page";
    // return `Rows: ${this.rowCount.toLocaleString()}`;
  }, [selectedCells, allRowCount, loadedRows, visibleRealColumns]);

  if (!loadedRows || !columns || columns.length == 0)
    return (
      <LoadingInfoWrapper>
        <LoadingInfoBox>
          <LoadingInfo message="Waiting for structure" />
        </LoadingInfoBox>
      </LoadingInfoWrapper>
    );

  if (errorMessage) {
    return <ErrorInfo message={errorMessage} />;
  }

  const handleRowScroll = (value) => {
    setFirstVisibleRowScrollIndex(value);
  };

  const handleColumnScroll = (value) => {
    setFirstVisibleColumnScrollIndex(value);
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    showMenu(
      event.pageX,
      event.pageY,
      <DataGridContextMenu
        copy={handleCopy}
        revertRowChanges={revertRowChanges}
        deleteSelectedRows={deleteSelectedRows}
        insertNewRow={insertNewRow}
        reload={() => display.reload()}
        setNull={setNull}
        exportGrid={exportGrid}
      />
    );
  };

  function handleGridMouseDown(event) {
    if (event.target.closest('.buttonLike')) return;
    if (event.target.closest('.resizeHandleControl')) return;
    if (event.target.closest('input')) return;

    // event.target.closest('table').focus();
    event.preventDefault();
    // @ts-ignore
    if (focusFieldRef.current) focusFieldRef.current.focus();
    const cell = cellFromEvent(event);

    if (event.button == 2 && cell && cellIsSelected(cell[0], cell[1], selectedCells)) return;

    const autofill = event.target.closest('div.autofillHandleMarker');
    if (autofill) {
      setAutofillDragStartCell(cell);
    } else {
      setCurrentCell(cell);

      if (event.ctrlKey) {
        if (isRegularCell(cell)) {
          if (selectedCells.find((x) => x[0] == cell[0] && x[1] == cell[1])) {
            setSelectedCells(selectedCells.filter((x) => x[0] != cell[0] || x[1] != cell[1]));
          } else {
            setSelectedCells([...selectedCells, cell]);
          }
        }
      } else {
        setSelectedCells(getCellRange(cell, cell));
        setDragStartCell(cell);

        if (isRegularCell(cell) && !_.isEqual(cell, inplaceEditorState.cell) && _.isEqual(cell, currentCell)) {
          // @ts-ignore
          dispatchInsplaceEditor({ type: 'show', cell, selectAll: true });
        } else if (!_.isEqual(cell, inplaceEditorState.cell)) {
          // @ts-ignore
          dispatchInsplaceEditor({ type: 'close' });
        }
      }
    }

    if (display.focusedColumn) display.focusColumn(null);
  }

  function handleCopy(event) {
    if (event && event.target.localName == 'input') return;
    if (event) event.preventDefault();
    copyToClipboard();
  }

  function exportGrid() {
    showModal((modalState) => (
      <ImportExportModal
        modalState={modalState}
        initialValues={{
          sourceStorageType: 'database',
          sourceConnectionId: conid,
          sourceDatabaseName: database,
          sourceSchemaName: display.baseTable && display.baseTable.schemaName,
          sourceTables: display.baseTable ? [display.baseTable.pureName] : [],
        }}
      />
    ));
  }

  function setCellValue(chs, cell, value) {
    return setChangeSetValue(
      chs,
      display.getChangeSetField(
        loadedAndInsertedRows[cell[0]],
        realColumnUniqueNames[cell[1]],
        cell[0] >= loadedRows.length ? cell[0] - loadedRows.length : null
      ),
      value
    );
  }

  function handlePaste(event) {
    var pastedText = undefined;
    // @ts-ignore
    if (window.clipboardData && window.clipboardData.getData) {
      // IE
      // @ts-ignore
      pastedText = window.clipboardData.getData('Text');
    } else if (event.clipboardData && event.clipboardData.getData) {
      pastedText = event.clipboardData.getData('text/plain');
    }
    event.preventDefault();
    const pasteRows = pastedText
      .replace(/\r/g, '')
      .split('\n')
      .map((row) => row.split('\t'));
    let chs = changeSet;
    let allRows = loadedAndInsertedRows;

    if (selectedCells.length <= 1) {
      const startRow = isRegularCell(currentCell) ? currentCell[0] : loadedAndInsertedRows.length;
      const startCol = isRegularCell(currentCell) ? currentCell[1] : 0;
      let rowIndex = startRow;
      for (const rowData of pasteRows) {
        if (rowIndex >= allRows.length) {
          chs = changeSetInsertNewRow(chs, display.baseTable);
          allRows = [...loadedRows, ...getChangeSetInsertedRows(chs, display.baseTable)];
        }
        let colIndex = startCol;
        const row = allRows[rowIndex];
        for (const cell of rowData) {
          chs = setChangeSetValue(
            chs,
            display.getChangeSetField(
              row,
              realColumnUniqueNames[colIndex],
              rowIndex >= loadedRows.length ? rowIndex - loadedRows.length : null
            ),
            cell == '(NULL)' ? null : cell
          );
          colIndex += 1;
        }
        rowIndex += 1;
      }
    }
    if (selectedCells.length > 1) {
      const regularSelected = selectedCells.filter(isRegularCell);
      const startRow = _.min(regularSelected.map((x) => x[0]));
      const startCol = _.min(regularSelected.map((x) => x[1]));
      for (const cell of regularSelected) {
        const [rowIndex, colIndex] = cell;
        const selectionRow = rowIndex - startRow;
        const selectionCol = colIndex - startCol;
        const pasteRow = pasteRows[selectionRow % pasteRows.length];
        const pasteCell = pasteRow[selectionCol % pasteRow.length];
        chs = setCellValue(chs, cell, pasteCell);
      }
    }

    setChangeSet(chs);
  }

  function setNull() {
    let chs = changeSet;
    selectedCells.filter(isRegularCell).forEach((cell) => {
      chs = setCellValue(chs, cell, null);
    });
    setChangeSet(chs);
  }

  function cellsToRegularCells(cells) {
    cells = _.flatten(
      cells.map((cell) => {
        if (cell[1] == 'header') {
          return _.range(0, columnSizes.count).map((col) => [cell[0], col]);
        }
        return [cell];
      })
    );
    cells = _.flatten(
      cells.map((cell) => {
        if (cell[0] == 'header') {
          return _.range(0, allRowCount).map((row) => [row, cell[1]]);
        }
        return [cell];
      })
    );
    return cells.filter(isRegularCell);
  }

  function copyToClipboard() {
    const cells = cellsToRegularCells(selectedCells);
    const rowIndexes = _.sortBy(_.uniq(cells.map((x) => x[0])));
    const lines = rowIndexes.map((rowIndex) => {
      let colIndexes = _.sortBy(cells.filter((x) => x[0] == rowIndex).map((x) => x[1]));
      const rowData = loadedAndInsertedRows[rowIndex];
      if (!rowData) return '';
      const line = colIndexes
        .map((col) => realColumnUniqueNames[col])
        .map((col) => (rowData[col] == null ? '(NULL)' : rowData[col]))
        .join('\t');
      return line;
    });
    const text = lines.join('\r\n');
    copyTextToClipboard(text);
  }

  function handleGridMouseMove(event) {
    if (autofillDragStartCell) {
      const cell = cellFromEvent(event);
      if (isRegularCell(cell) && (cell[0] == autofillDragStartCell[0] || cell[1] == autofillDragStartCell[1])) {
        const autoFillStart = [selectedCells[0][0], _.min(selectedCells.map((x) => x[1]))];
        // @ts-ignore
        setAutofillSelectedCells(getCellRange(autoFillStart, cell));
      }
    } else if (dragStartCell) {
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
    if (autofillDragStartCell) {
      const currentRowNumber = currentCell[0];
      if (_.isNumber(currentRowNumber)) {
        const rowIndexes = _.uniq((autofillSelectedCells || []).map((x) => x[0])).filter((x) => x != currentRowNumber);
        // @ts-ignore
        const colNames = selectedCells.map((cell) => realColumnUniqueNames[cell[1]]);
        const changeObject = _.pick(loadedAndInsertedRows[currentRowNumber], colNames);
        setChangeSet(
          batchUpdateChangeSet(
            changeSet,
            getRowDefinitions(rowIndexes),
            // @ts-ignore
            rowIndexes.map(() => changeObject)
          )
        );
      }

      setAutofillDragStartCell(null);
      setAutofillSelectedCells([]);
      setSelectedCells(autofillSelectedCells);
    }
  }

  function getRowDefinitions(rowIndexes) {
    const res = [];
    if (!loadedAndInsertedRows) return res;
    for (const index of rowIndexes) {
      if (loadedAndInsertedRows[index] && _.isNumber(index)) {
        const insertedRowIndex = index >= loadedRows.length ? index - loadedRows.length : null;
        res.push(display.getChangeSetRow(loadedAndInsertedRows[index], insertedRowIndex));
      }
    }
    return res;
  }

  function getSelectedRowIndexes() {
    return _.uniq((selectedCells || []).map((x) => x[0]));
  }

  function getSelectedRowDefinitions() {
    return getRowDefinitions(getSelectedRowIndexes());
  }

  function getSelectedRowData() {
    return _.compact(getSelectedRowIndexes().map((index) => loadedRows && loadedRows[index]));
  }

  function revertRowChanges() {
    const updatedChangeSet = getSelectedRowDefinitions().reduce(
      (chs, row) => revertChangeSetRowChanges(chs, row),
      changeSet
    );
    setChangeSet(updatedChangeSet);
  }

  function revertAllChanges() {
    setChangeSet(createChangeSet());
  }

  function deleteSelectedRows() {
    const updatedChangeSet = getSelectedRowDefinitions().reduce((chs, row) => deleteChangeSetRows(chs, row), changeSet);
    setChangeSet(updatedChangeSet);
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

  // async function blurEditorAndSave() {
  //   setInplaceEditorCell(null);
  //   setInplaceEditorInitText(null);
  //   await sleep(1);
  // }

  function undo() {
    dispatchChangeSet({ type: 'undo' });
  }
  function redo() {
    dispatchChangeSet({ type: 'redo' });
  }

  function handleSave() {
    if (inplaceEditorState.cell) {
      // @ts-ignore
      dispatchInsplaceEditor({ type: 'shouldSave' });
      return;
    }
    const script = changeSetToSql(changeSetRef.current, display.dbinfo);
    const sql = scriptToSql(display.driver, script);
    setConfirmSql(sql);
    confirmSqlModalState.open();
  }

  async function handleConfirmSql() {
    const resp = await axios.request({
      url: 'database-connections/query-data',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: { sql: confirmSql },
    });

    const { errorMessage } = resp.data || {};
    if (errorMessage) {
      showModal((modalState) => (
        <ErrorMessageModal modalState={modalState} message={errorMessage} title="Error when saving" />
      ));
    } else {
      dispatchChangeSet({ type: 'reset', value: createChangeSet() });
      setConfirmSql(null);
      display.reload();
    }
  }

  const insertNewRow = () => {
    if (display.baseTable) {
      setChangeSet(changeSetInsertNewRow(changeSet, display.baseTable));
      const cell = [rowCountNewIncluded, (currentCell && currentCell[1]) || 0];
      // @ts-ignore
      setCurrentCell(cell);
      // @ts-ignore
      setSelectedCells([cell]);
      scrollIntoView(cell);
    }
  };

  function handleGridKeyDown(event) {
    if (event.keyCode == keycodes.f5) {
      event.preventDefault();
      display.reload();
    }

    if (event.keyCode == keycodes.s && event.ctrlKey) {
      event.preventDefault();
      handleSave();
      // this.saveAndFocus();
    }

    if (event.keyCode == keycodes.n0 && event.ctrlKey) {
      event.preventDefault();
      setNull();
    }

    if (event.keyCode == keycodes.r && event.ctrlKey) {
      event.preventDefault();
      revertRowChanges();
    }

    if (event.keyCode == keycodes.z && event.ctrlKey) {
      event.preventDefault();
      undo();
    }

    if (event.keyCode == keycodes.y && event.ctrlKey) {
      event.preventDefault();
      redo();
    }

    if (event.keyCode == keycodes.c && event.ctrlKey) {
      event.preventDefault();
      copyToClipboard();
    }

    if (event.keyCode == keycodes.delete && event.ctrlKey) {
      event.preventDefault();
      deleteSelectedRows();
      // this.saveAndFocus();
    }

    if (event.keyCode == keycodes.insert && !event.ctrlKey) {
      event.preventDefault();
      insertNewRow();
      // this.saveAndFocus();
    }

    if (inplaceEditorState.cell) return;

    if (
      !event.ctrlKey &&
      !event.altKey &&
      ((event.keyCode >= keycodes.a && event.keyCode <= keycodes.z) ||
        (event.keyCode >= keycodes.n0 && event.keyCode <= keycodes.n9) ||
        event.keyCode == keycodes.dash)
    ) {
      // @ts-ignore
      dispatchInsplaceEditor({ type: 'show', text: event.nativeEvent.key, cell: currentCell });
      // console.log('event', event.nativeEvent);
    }

    if (event.keyCode == keycodes.f2) {
      // @ts-ignore
      dispatchInsplaceEditor({ type: 'show', cell: currentCell, selectAll: true });
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
      setSelectedCells(getCellRange(shiftDragStartCell || currentCell, newCell));
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

  function moveCurrentCell(row, col, event = null) {
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
      if (rowCount == 0) return;

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
  // console.log(
  //   'gridScrollAreaWidth / columnSizes.getVisibleScrollSizeSum()',
  //   gridScrollAreaWidth,
  //   columnSizes.getVisibleScrollSizeSum()
  // );

  const loadedAndInsertedRows = [...loadedRows, ...insertedRows];

  // console.log('focusFieldRef.current', focusFieldRef.current);

  return (
    <GridContainer ref={containerRef}>
      <FocusField
        type="text"
        ref={focusFieldRef}
        onKeyDown={handleGridKeyDown}
        onCopy={handleCopy}
        onPaste={handlePaste}
      />
      <Table
        onMouseDown={handleGridMouseDown}
        onMouseMove={handleGridMouseMove}
        onMouseUp={handleGridMouseUp}
        onWheel={handleGridWheel}
        // ref={tableRef}
        onContextMenu={handleContextMenu}
      >
        <TableHead>
          <TableHeaderRow ref={headerRowRef}>
            <TableHeaderCell data-row="header" data-col="header" />
            {visibleRealColumns.map((col) => (
              <TableHeaderCell
                data-row="header"
                data-col={col.colIndex}
                key={col.uniqueName}
                style={{ width: col.widthPx, minWidth: col.widthPx, maxWidth: col.widthPx }}
              >
                <ColumnHeaderControl
                  column={col}
                  setSort={display.sortable ? (order) => display.setSort(col.uniqueName, order) : null}
                  order={display.getSortOrder(col.uniqueName)}
                  onResize={(diff) => display.resizeColumn(col.uniqueName, col.widthNumber, diff)}
                />
              </TableHeaderCell>
            ))}
          </TableHeaderRow>
          {display.filterable && (
            <TableHeaderRow>
              <TableHeaderCell
                style={{ width: hederColwidthPx, minWidth: hederColwidthPx, maxWidth: hederColwidthPx }}
                data-row="filter"
                data-col="header"
              >
                {filterCount > 0 && (
                  <InlineButton onClick={handleClearFilters} square>
                    <i className="fas fa-times" />
                  </InlineButton>
                )}
              </TableHeaderCell>
              {visibleRealColumns.map((col) => (
                <TableFilterCell
                  key={col.uniqueName}
                  style={{ width: col.widthPx, minWidth: col.widthPx, maxWidth: col.widthPx }}
                  data-row="filter"
                  data-col={col.colIndex}
                >
                  <DataFilterControl
                    filterType={getFilterType(col.commonType ? col.commonType.typeCode : null)}
                    filter={display.getFilter(col.uniqueName)}
                    setFilter={(value) => display.setFilter(col.uniqueName, value)}
                  />
                </TableFilterCell>
              ))}
            </TableHeaderRow>
          )}
        </TableHead>
        <TableBody ref={tableBodyRef}>
          {loadedAndInsertedRows
            .slice(firstVisibleRowScrollIndex, firstVisibleRowScrollIndex + visibleRowCountUpperBound)
            .map((row, index) => (
              <DataGridRow
                key={firstVisibleRowScrollIndex + index}
                rowIndex={firstVisibleRowScrollIndex + index}
                rowHeight={rowHeight}
                visibleRealColumns={visibleRealColumns}
                inplaceEditorState={inplaceEditorState}
                dispatchInsplaceEditor={dispatchInsplaceEditor}
                autofillSelectedCells={autofillSelectedCells}
                selectedCells={filterCellsForRow(selectedCells, firstVisibleRowScrollIndex + index)}
                insertedRowIndex={
                  firstVisibleRowScrollIndex + index >= loadedRows.length
                    ? firstVisibleRowScrollIndex + index - loadedRows.length
                    : null
                }
                autofillMarkerCell={filterCellForRow(autofillMarkerCell, firstVisibleRowScrollIndex + index)}
                changeSet={changeSet}
                setChangeSet={setChangeSet}
                display={display}
                row={row}
                focusedColumn={display.focusedColumn}
              />
            ))}
        </TableBody>
      </Table>
      <HorizontalScrollBar
        valueToSet={hScrollValueToSet}
        valueToSetDate={hScrollValueToSetDate}
        minimum={0}
        maximum={maxScrollColumn}
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
      <ConfirmSqlModal
        modalState={confirmSqlModalState}
        sql={confirmSql}
        engine={display.engine}
        onConfirm={handleConfirmSql}
      />
      {allRowCount && <RowCountLabel>{rowCountInfo}</RowCountLabel>}
      {props.toolbarPortalRef &&
        tabVisible &&
        ReactDOM.createPortal(
          <DataGridToolbar
            reload={() => display.reload()}
            save={handleSave}
            changeSetState={changeSetState}
            dispatchChangeSet={dispatchChangeSet}
            revert={revertAllChanges}
          />,
          props.toolbarPortalRef.current
        )}
      {isLoading && (
        <LoadingInfoWrapper>
          <LoadingInfoBox>
            <LoadingInfo message="Loading data" />
          </LoadingInfoBox>
        </LoadingInfoWrapper>
      )}
    </GridContainer>
  );
}
