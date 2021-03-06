import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { HorizontalScrollBar, VerticalScrollBar } from './ScrollBars';
import useDimensions from '../utility/useDimensions';
import DataFilterControl from './DataFilterControl';
import stableStringify from 'json-stable-stringify';
import { getFilterType, getFilterValueExpression } from 'dbgate-filterparser';
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
import { copyTextToClipboard } from '../utility/clipboard';
import DataGridToolbar from './DataGridToolbar';
// import usePropsCompare from '../utility/usePropsCompare';
import ColumnHeaderControl from './ColumnHeaderControl';
import InlineButton from '../widgets/InlineButton';
import DataGridContextMenu from './DataGridContextMenu';
import LoadingInfo from '../widgets/LoadingInfo';
import ErrorInfo from '../widgets/ErrorInfo';
import { useSetOpenedTabs } from '../utility/globalState';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';
import { useShowMenu } from '../modals/showMenu';
import useOpenNewTab from '../utility/useOpenNewTab';
import axios from '../utility/axios';
import openReferenceForm from '../formview/openReferenceForm';

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
  // right: 20px;
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
  border: 1px solid ${props => props.theme.border};
  // border-collapse: collapse;
  text-align: left;
  padding: 0;
  // padding: 2px;
  margin: 0;
  background-color: ${props => props.theme.gridheader_background};
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
  background-color: ${props => props.theme.gridbody_background_yellow[1]};
  right: 40px;
  bottom: 20px;
`;

/** @param props {import('./types').DataGridProps} */
export default function DataGridCore(props) {
  const {
    display,
    conid,
    database,
    tabVisible,
    loadNextData,
    errorMessage,
    isLoadedAll,
    loadedTime,
    exportGrid,
    openActiveChart,
    allRowCount,
    openQuery,
    onSave,
    isLoading,
    grider,
    onSelectionChanged,
    frameSelection,
    onKeyDown,
    formViewAvailable,
  } = props;
  // console.log('RENDER GRID', display.baseTable.pureName);
  const columns = React.useMemo(() => display.allColumns, [display]);
  const openNewTab = useOpenNewTab();

  // usePropsCompare(props);

  // console.log(`GRID, conid=${conid}, database=${database}, sql=${sql}`);

  const focusFieldRef = React.useRef(null);

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
  const [focusFilterInputs, setFocusFilterInputs] = React.useState({});
  const showMenu = useShowMenu();

  const autofillMarkerCell = React.useMemo(
    () =>
      selectedCells && selectedCells.length > 0 && _.uniq(selectedCells.map(x => x[0])).length == 1
        ? [_.max(selectedCells.map(x => x[0])), _.max(selectedCells.map(x => x[1]))]
        : null,
    [selectedCells]
  );

  const [firstVisibleRowScrollIndex, setFirstVisibleRowScrollIndex] = React.useState(0);
  const [firstVisibleColumnScrollIndex, setFirstVisibleColumnScrollIndex] = React.useState(0);

  const [headerRowRef, { height: rowHeight }] = useDimensions();
  const [tableBodyRef] = useDimensions();
  const [containerRef, { height: containerHeight, width: containerWidth }] = useDimensions();

  const [inplaceEditorState, dispatchInsplaceEditor] = React.useReducer((state, action) => {
    switch (action.type) {
      case 'show':
        if (!grider.editable) return {};
        return {
          cell: action.cell,
          text: action.text,
          selectAll: action.selectAll,
        };
      case 'close': {
        const [row, col] = currentCell || [];
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

  const columnSizes = React.useMemo(() => countColumnSizes(grider, columns, containerWidth, display), [
    grider,
    columns,
    containerWidth,
    display,
  ]);
  const headerColWidth = 40;

  // console.log('containerWidth', containerWidth);

  const gridScrollAreaHeight = containerHeight - 2 * rowHeight;
  const gridScrollAreaWidth = containerWidth - columnSizes.frozenSize - headerColWidth - 32;

  const visibleRowCountUpperBound = Math.ceil(gridScrollAreaHeight / Math.floor(Math.max(1, rowHeight)));
  const visibleRowCountLowerBound = Math.floor(gridScrollAreaHeight / Math.ceil(Math.max(1, rowHeight)));
  //   const visibleRowCountUpperBound = 20;
  //   const visibleRowCountLowerBound = 20;
  // console.log('containerHeight', containerHeight);
  // console.log('visibleRowCountUpperBound', visibleRowCountUpperBound);
  // console.log('rowHeight', rowHeight);

  React.useEffect(() => {
    if (tabVisible) {
      if (focusFieldRef.current) focusFieldRef.current.focus();
    }
  }, [tabVisible, focusFieldRef.current]);

  React.useEffect(() => {
    if (onSelectionChanged) {
      onSelectionChanged(getSelectedCellsPublished());
    }
  }, [onSelectionChanged, selectedCells]);

  const maxScrollColumn = React.useMemo(() => {
    let newColumn = columnSizes.scrollInView(0, columns.length - 1 - columnSizes.frozenCount, gridScrollAreaWidth);
    return newColumn;
  }, [columnSizes, gridScrollAreaWidth]);

  React.useEffect(() => {
    if (props.onReferenceSourceChanged && (grider.rowCount > 0 || isLoadedAll)) {
      props.onReferenceSourceChanged(getSelectedRowData(), loadedTime);
    }
  }, [props.onReferenceSourceChanged, selectedCells, props.refReloadToken, grider.getRowData(0)]);

  // usePropsCompare({ columnSizes, firstVisibleColumnScrollIndex, gridScrollAreaWidth, columns });

  const visibleRealColumns = React.useMemo(
    () => countVisibleRealColumns(columnSizes, firstVisibleColumnScrollIndex, gridScrollAreaWidth, columns),
    [columnSizes, firstVisibleColumnScrollIndex, gridScrollAreaWidth, columns]
  );

  const realColumnUniqueNames = React.useMemo(
    () =>
      _.range(columnSizes.realCount).map(realIndex => (columns[columnSizes.realToModel(realIndex)] || {}).uniqueName),
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

  React.useEffect(() => {
    if (loadNextData && firstVisibleRowScrollIndex + visibleRowCountUpperBound >= grider.rowCount) {
      loadNextData();
    }
  });

  React.useEffect(() => {
    if (display.groupColumns && display.baseTable) {
      props.onReferenceClick({
        schemaName: display.baseTable.schemaName,
        pureName: display.baseTable.pureName,
        columns: display.groupColumns.map(col => ({
          baseName: col,
          refName: col,
          dataType: _.get(display.baseTable && display.baseTable.columns.find(x => x.columnName == col), 'dataType'),
        })),
      });
    }
  }, [display.baseTable, stableStringify(display && display.groupColumns)]);

  const theme = useTheme();

  const rowCountInfo = React.useMemo(() => {
    if (selectedCells.length > 1 && selectedCells.every(x => _.isNumber(x[0]) && _.isNumber(x[1]))) {
      let sum = _.sumBy(selectedCells, cell => {
        const row = grider.getRowData(cell[0]);
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
  }, [selectedCells, allRowCount, grider, visibleRealColumns]);

  const handleSetFormView = React.useMemo(
    () =>
      formViewAvailable && display.baseTable && display.baseTable.primaryKey
        ? (rowData, column) => {
            if (column) {
              openReferenceForm(rowData, column, openNewTab, conid, database);
            } else {
              display.switchToFormView(rowData);
            }
          }
        : null,
    [formViewAvailable, display, openNewTab]
  );

  if (!columns || columns.length == 0) return <LoadingInfo wrapper message="Waiting for structure" />;

  if (errorMessage) {
    return <ErrorInfo message={errorMessage} />;
  }

  if (grider.errors && grider.errors.length > 0) {
    return (
      <div>
        {grider.errors.map((err, index) => (
          <ErrorInfo message={err} key={index} isSmall />
        ))}
      </div>
    );
  }

  const handleRowScroll = value => {
    setFirstVisibleRowScrollIndex(value);
  };

  const handleColumnScroll = value => {
    setFirstVisibleColumnScrollIndex(value);
  };

  const getSelectedFreeData = () => {
    const columns = getSelectedColumns();
    const rows = getSelectedRowData().map(row => _.pickBy(row, (v, col) => columns.find(x => x.columnName == col)));
    return {
      structure: {
        columns,
      },
      rows,
    };
  };

  const handleOpenFreeTable = () => {
    openNewTab(
      {
        title: 'Data #',
        icon: 'img free-table',
        tabComponent: 'FreeTableTab',
        props: {},
      },
      { editor: getSelectedFreeData() }
    );
  };

  const handleOpenChart = () => {
    openNewTab(
      {
        title: 'Chart #',
        icon: 'img chart',
        tabComponent: 'ChartTab',
        props: {},
      },
      {
        editor: {
          data: getSelectedFreeData(),
          config: { chartType: 'bar' },
        },
      }
    );
  };

  const handleContextMenu = event => {
    event.preventDefault();
    showMenu(
      event.pageX,
      event.pageY,
      <DataGridContextMenu
        copy={handleCopy}
        revertRowChanges={grider.containsChanges ? revertRowChanges : null}
        deleteSelectedRows={grider.editable ? deleteSelectedRows : null}
        insertNewRow={grider.editable ? insertNewRow : null}
        reload={display.supportsReload ? () => display.reload() : null}
        setNull={grider.editable ? setNull : null}
        exportGrid={exportGrid}
        filterSelectedValue={display.filterable ? filterSelectedValue : null}
        openQuery={openQuery}
        openFreeTable={handleOpenFreeTable}
        openChartSelection={handleOpenChart}
        openActiveChart={openActiveChart}
        switchToForm={handleSwitchToFormView}
      />
    );
  };

  function handleGridMouseDown(event) {
    if (event.target.closest('.buttonLike')) return;
    if (event.target.closest('.resizeHandleControl')) return;
    if (event.target.closest('input')) return;

    // event.target.closest('table').focus();
    event.preventDefault();
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
          if (selectedCells.find(x => x[0] == cell[0] && x[1] == cell[1])) {
            setSelectedCells(selectedCells.filter(x => x[0] != cell[0] || x[1] != cell[1]));
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

  function setCellValue(cell, value) {
    grider.setCellValue(cell[0], realColumnUniqueNames[cell[1]], value);
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
    grider.beginUpdate();
    const pasteRows = pastedText
      .replace(/\r/g, '')
      .split('\n')
      .map(row => row.split('\t'));
    const selectedRegular = cellsToRegularCells(selectedCells);
    if (selectedRegular.length <= 1) {
      const startRow = isRegularCell(currentCell) ? currentCell[0] : grider.rowCount;
      const startCol = isRegularCell(currentCell) ? currentCell[1] : 0;
      let rowIndex = startRow;
      for (const rowData of pasteRows) {
        if (rowIndex >= grider.rowCountInUpdate) {
          grider.insertRow();
        }
        let colIndex = startCol;
        for (const cell of rowData) {
          setCellValue([rowIndex, colIndex], cell == '(NULL)' ? null : cell);
          colIndex += 1;
        }
        rowIndex += 1;
      }
    }
    if (selectedRegular.length > 1) {
      const startRow = _.min(selectedRegular.map(x => x[0]));
      const startCol = _.min(selectedRegular.map(x => x[1]));
      for (const cell of selectedRegular) {
        const [rowIndex, colIndex] = cell;
        const selectionRow = rowIndex - startRow;
        const selectionCol = colIndex - startCol;
        const pasteRow = pasteRows[selectionRow % pasteRows.length];
        const pasteCell = pasteRow[selectionCol % pasteRow.length];
        setCellValue(cell, pasteCell);
      }
    }
    grider.endUpdate();
  }

  function setNull() {
    grider.beginUpdate();
    selectedCells.filter(isRegularCell).forEach(cell => {
      setCellValue(cell, null);
    });
    grider.endUpdate();
  }

  function cellsToRegularCells(cells) {
    cells = _.flatten(
      cells.map(cell => {
        if (cell[1] == 'header') {
          return _.range(0, columnSizes.count).map(col => [cell[0], col]);
        }
        return [cell];
      })
    );
    cells = _.flatten(
      cells.map(cell => {
        if (cell[0] == 'header') {
          return _.range(0, grider.rowCount).map(row => [row, cell[1]]);
        }
        return [cell];
      })
    );
    return cells.filter(isRegularCell);
  }

  function copyToClipboard() {
    const cells = cellsToRegularCells(selectedCells);
    const rowIndexes = _.sortBy(_.uniq(cells.map(x => x[0])));
    const lines = rowIndexes.map(rowIndex => {
      let colIndexes = _.sortBy(cells.filter(x => x[0] == rowIndex).map(x => x[1]));
      const rowData = grider.getRowData(rowIndex);
      if (!rowData) return '';
      const line = colIndexes
        .map(col => realColumnUniqueNames[col])
        .map(col => (rowData[col] == null ? '(NULL)' : rowData[col]))
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
        const autoFillStart = [selectedCells[0][0], _.min(selectedCells.map(x => x[1]))];
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
        const rowIndexes = _.uniq((autofillSelectedCells || []).map(x => x[0])).filter(x => x != currentRowNumber);
        const colNames = selectedCells.map(cell => realColumnUniqueNames[cell[1]]);
        const changeObject = _.pick(grider.getRowData(currentRowNumber), colNames);
        grider.beginUpdate();
        for (const index of rowIndexes) grider.updateRow(index, changeObject);
        grider.endUpdate();
      }

      setAutofillDragStartCell(null);
      setAutofillSelectedCells([]);
      setSelectedCells(autofillSelectedCells);
    }
  }

  function getSelectedRowIndexes() {
    if (selectedCells.find(x => x[0] == 'header')) return _.range(0, grider.rowCount);
    return _.uniq((selectedCells || []).map(x => x[0])).filter(x => _.isNumber(x));
  }

  function getSelectedColumnIndexes() {
    if (selectedCells.find(x => x[1] == 'header')) return _.range(0, realColumnUniqueNames.length);
    return _.uniq((selectedCells || []).map(x => x[1])).filter(x => _.isNumber(x));
  }

  function getSelectedCellsPublished() {
    const regular = cellsToRegularCells(selectedCells);
    // @ts-ignore
    return regular
      .map(cell => ({
        row: cell[0],
        column: realColumnUniqueNames[cell[1]],
      }))
      .filter(x => x.column);

    // return regular.map((cell) => {
    //   const row = cell[0];
    //   const column = realColumnUniqueNames[cell[1]];
    //   let value = null;
    //   if (grider && column) {
    //     let rowData = grider.getRowData(row);
    //     if (rowData) value = rowData[column];
    //   }
    //   return {
    //     row,
    //     column,
    //     value,
    //   };
    // });
  }

  function getSelectedRowData() {
    return _.compact(getSelectedRowIndexes().map(index => grider.getRowData(index)));
  }

  function getSelectedColumns() {
    return _.compact(
      getSelectedColumnIndexes().map(index => ({
        columnName: realColumnUniqueNames[index],
      }))
    );
  }

  function revertRowChanges() {
    grider.beginUpdate();
    for (const index of getSelectedRowIndexes()) {
      if (_.isNumber(index)) grider.revertRowChanges(index);
    }
    grider.endUpdate();
  }

  function filterSelectedValue() {
    const flts = {};
    for (const cell of selectedCells) {
      if (!isRegularCell(cell)) continue;
      const modelIndex = columnSizes.realToModel(cell[1]);
      const columnName = columns[modelIndex].uniqueName;
      let value = grider.getRowData(cell[0])[columnName];
      let svalue = getFilterValueExpression(value, columns[modelIndex].dataType);
      if (_.has(flts, columnName)) flts[columnName] += ',' + svalue;
      else flts[columnName] = svalue;
    }

    display.setFilters(flts);
  }

  function deleteSelectedRows() {
    grider.beginUpdate();
    for (const index of getSelectedRowIndexes()) {
      if (_.isNumber(index)) grider.deleteRow(index);
    }
    grider.endUpdate();
  }

  function handleGridWheel(event) {
    let newFirstVisibleRowScrollIndex = firstVisibleRowScrollIndex;
    if (event.deltaY > 0) {
      newFirstVisibleRowScrollIndex += wheelRowCount;
    }
    if (event.deltaY < 0) {
      newFirstVisibleRowScrollIndex -= wheelRowCount;
    }
    let rowCount = grider.rowCount;
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

  function undo() {
    grider.undo();
  }
  function redo() {
    grider.redo();
  }

  function handleSave() {
    if (inplaceEditorState.cell) {
      // @ts-ignore
      dispatchInsplaceEditor({ type: 'shouldSave' });
      return;
    }
    if (onSave) onSave();
  }

  const insertNewRow = () => {
    if (grider.canInsert) {
      const rowIndex = grider.insertRow();
      const cell = [rowIndex, (currentCell && currentCell[1]) || 0];
      // @ts-ignore
      setCurrentCell(cell);
      // @ts-ignore
      setSelectedCells([cell]);
      scrollIntoView(cell);
    }
  };

  const selectTopmostCell = uniquePath => {
    const modelIndex = columns.findIndex(x => x.uniquePath == uniquePath);
    const realIndex = columnSizes.modelToReal(modelIndex);
    let cell = [firstVisibleRowScrollIndex, realIndex];
    // @ts-ignore
    setCurrentCell(cell);
    // @ts-ignore
    setSelectedCells([cell]);
    focusFieldRef.current.focus();
  };

  function handleGridKeyDown(event) {
    if (onKeyDown) {
      onKeyDown(event);
    }

    if (event.keyCode == keycodes.f5) {
      event.preventDefault();
      display.reload();
    }

    if (event.keyCode == keycodes.f4) {
      event.preventDefault();
      handleSwitchToFormView();
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

    if (event.keyCode == keycodes.f && event.ctrlKey) {
      event.preventDefault();
      filterSelectedValue();
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
    let rowCount = grider.rowCount;
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
    let modelIndex = columnSizes.realToModel(columnRealIndex);
    setFocusFilterInputs(cols => ({
      ...cols,
      [columns[modelIndex].uniqueName]: (cols[columns[modelIndex].uniqueName] || 0) + 1,
    }));
    // this.headerFilters[this.columns[modelIndex].uniquePath].focus();
    return ['filter', columnRealIndex];
  }

  function moveCurrentCell(row, col, event = null) {
    const rowCount = grider.rowCount;

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
      const rowCount = grider.rowCount;
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

  function setGrouping(uniqueName, groupFunc) {
    display.setGrouping(uniqueName, groupFunc);
  }

  //   console.log('visibleRowCountUpperBound', visibleRowCountUpperBound);
  //   console.log('gridScrollAreaHeight', gridScrollAreaHeight);
  //   console.log('containerHeight', containerHeight);

  const hederColwidthPx = `${headerColWidth}px`;
  const filterCount = display.filterCount;

  const handleClearFilters = () => {
    display.clearFilters();
  };

  const handleSwitchToFormView =
    formViewAvailable && display.baseTable && display.baseTable.primaryKey
      ? () => {
          const cell = currentCell;
          const rowData = isRegularCell(cell) ? grider.getRowData(cell[0]) : null;
          display.switchToFormView(rowData);
        }
      : null;

  // console.log('visibleRealColumnIndexes', visibleRealColumnIndexes);
  // console.log(
  //   'gridScrollAreaWidth / columnSizes.getVisibleScrollSizeSum()',
  //   gridScrollAreaWidth,
  //   columnSizes.getVisibleScrollSizeSum()
  // );

  // const loadedAndInsertedRows = [...loadedRows, ...insertedRows];

  // console.log('focusFieldRef.current', focusFieldRef.current);

  return (
    <GridContainer ref={containerRef} onContextMenu={handleContextMenu}>
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
            <TableHeaderCell data-row="header" data-col="header" theme={theme} />
            {visibleRealColumns.map(col => (
              <TableHeaderCell
                theme={theme}
                data-row="header"
                data-col={col.colIndex}
                key={col.uniqueName}
                style={{ width: col.widthPx, minWidth: col.widthPx, maxWidth: col.widthPx }}
              >
                <ColumnHeaderControl
                  column={col}
                  conid={conid}
                  database={database}
                  setSort={display.sortable ? order => display.setSort(col.uniqueName, order) : null}
                  order={display.getSortOrder(col.uniqueName)}
                  onResize={diff => display.resizeColumn(col.uniqueName, col.widthNumber, diff)}
                  setGrouping={display.sortable ? groupFunc => setGrouping(col.uniqueName, groupFunc) : null}
                  grouping={display.getGrouping(col.uniqueName)}
                />
              </TableHeaderCell>
            ))}
          </TableHeaderRow>
          {display.filterable && (
            <TableHeaderRow>
              <TableHeaderCell
                theme={theme}
                style={{ width: hederColwidthPx, minWidth: hederColwidthPx, maxWidth: hederColwidthPx }}
                data-row="filter"
                data-col="header"
              >
                {filterCount > 0 && (
                  <InlineButton onClick={handleClearFilters} square>
                    <FontIcon icon="icon filter-off" />
                  </InlineButton>
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
                    filterType={getFilterType(col.dataType)}
                    filter={display.getFilter(col.uniqueName)}
                    setFilter={value => display.setFilter(col.uniqueName, value)}
                    focusIndex={focusFilterInputs[col.uniqueName]}
                    onFocusGrid={() => {
                      selectTopmostCell(col.uniqueName);
                      // focusFieldRef.current.focus();
                    }}
                  />
                </TableFilterCell>
              ))}
            </TableHeaderRow>
          )}
        </TableHead>
        <TableBody ref={tableBodyRef}>
          {_.range(firstVisibleRowScrollIndex, firstVisibleRowScrollIndex + visibleRowCountUpperBound).map(rowIndex => (
            <DataGridRow
              // this component use React.memo
              // when adding props, check, whether they are correctly memoized and row is not rerendered
              // uncomment line console.log('RENDER ROW', rowIndex); in  DataGridRow.js for check
              key={rowIndex}
              grider={grider}
              rowIndex={rowIndex}
              rowHeight={rowHeight}
              visibleRealColumns={visibleRealColumns}
              inplaceEditorState={inplaceEditorState}
              dispatchInsplaceEditor={dispatchInsplaceEditor}
              autofillSelectedCells={autofillSelectedCells}
              selectedCells={filterCellsForRow(selectedCells, rowIndex)}
              autofillMarkerCell={filterCellForRow(autofillMarkerCell, rowIndex)}
              display={display}
              focusedColumn={display.focusedColumn}
              frameSelection={frameSelection}
              onSetFormView={handleSetFormView}
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
        maximum={grider.rowCount - visibleRowCountUpperBound + 2}
        onScroll={handleRowScroll}
        viewportRatio={visibleRowCountUpperBound / grider.rowCount}
      />
      {allRowCount && <RowCountLabel theme={theme}>{rowCountInfo}</RowCountLabel>}
      {props.toolbarPortalRef &&
        props.toolbarPortalRef.current &&
        tabVisible &&
        ReactDOM.createPortal(
          <DataGridToolbar
            reload={() => display.reload()}
            save={handleSave}
            grider={grider}
            reconnect={async () => {
              await axios.post('database-connections/refresh', { conid, database });
              display.reload();
            }}
            switchToForm={handleSwitchToFormView}
          />,
          props.toolbarPortalRef.current
        )}
      {isLoading && <LoadingInfo wrapper message="Loading data" />}
    </GridContainer>
  );
}
