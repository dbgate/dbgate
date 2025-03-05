<script lang="ts" context="module">
  const getCurrentDataGrid = () => getActiveComponent('DataGridCore');

  registerCommand({
    id: 'dataGrid.refresh',
    category: 'Data grid',
    name: _t('common.refresh', { defaultMessage: 'Refresh' }),
    keyText: 'F5 | CtrlOrCommand+R',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon reload',
    testEnabled: () => getCurrentDataGrid()?.canRefresh(),
    onClick: () => getCurrentDataGrid().refresh(),
  });

  registerCommand({
    id: 'dataGrid.deepRefresh',
    category: 'Data grid',
    name: 'Refresh with structure',
    keyText: 'Ctrl+F5',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon reload',
    testEnabled: () => getCurrentDataGrid()?.canDeepRefresh(),
    onClick: () => getCurrentDataGrid().deepRefresh(),
  });

  registerCommand({
    id: 'dataGrid.revertRowChanges',
    category: 'Data grid',
    name: _t('command.datagrid.revertRowChanges', { defaultMessage: 'Revert row changes' }),
    keyText: 'CtrlOrCommand+U',
    testEnabled: () => getCurrentDataGrid()?.getGrider()?.containsChanges,
    onClick: () => getCurrentDataGrid().revertRowChanges(),
  });

  registerCommand({
    id: 'dataGrid.revertAllChanges',
    category: 'Data grid',
    name: _t('command.datagrid.revertAllChanges', { defaultMessage: 'Revert all changes' }),
    toolbarName: _t('command.datagrid.revertAllChanges.toolbar', { defaultMessage: 'Revert all' }),
    icon: 'icon undo',
    testEnabled: () => getCurrentDataGrid()?.getGrider()?.containsChanges,
    onClick: () => getCurrentDataGrid().revertAllChanges(),
  });

  registerCommand({
    id: 'dataGrid.deleteSelectedRows',
    category: 'Data grid',
    name: _t('command.datagrid.deleteSelectedRows', { defaultMessage: 'Delete selected rows' }),
    toolbarName: _t('command.datagrid.deleteSelectedRows.toolbar', { defaultMessage: 'Delete row(s)' }),
    keyText: isMac() ? 'Command+Backspace' : 'CtrlOrCommand+Delete',
    icon: 'icon minus',
    testEnabled: () => getCurrentDataGrid()?.getGrider()?.editable,
    onClick: () => getCurrentDataGrid().deleteSelectedRows(),
  });

  registerCommand({
    id: 'dataGrid.insertNewRow',
    category: 'Data grid',
    name: _t('command.datagrid.insertNewRow', { defaultMessage: 'Insert new row' }),
    toolbarName: _t('command.datagrid.insertNewRow.toolbar', { defaultMessage: 'New row' }),
    icon: 'icon add',
    keyText: isMac() ? 'Command+I' : 'Insert',
    testEnabled: () => getCurrentDataGrid()?.getGrider()?.editable,
    onClick: () => getCurrentDataGrid().insertNewRow(),
  });

  registerCommand({
    id: 'dataGrid.addNewColumn',
    category: 'Data grid',
    name: _t('command.datagrid.addNewColumn', { defaultMessage: 'Add new column' }),
    toolbarName: _t('command.datagrid.addNewColumn.toolbar', { defaultMessage: 'New column' }),
    icon: 'icon add-column',
    testEnabled: () => getCurrentDataGrid()?.addNewColumnEnabled(),
    onClick: () => getCurrentDataGrid().addNewColumn(),
  });

  registerCommand({
    id: 'dataGrid.cloneRows',
    category: 'Data grid',
    name: _t('command.datagrid.cloneRows', { defaultMessage: 'Clone rows' }),
    toolbarName: _t('command.datagrid.cloneRows.toolbar', { defaultMessage: 'Clone row(s)' }),
    keyText: 'CtrlOrCommand+Shift+C',
    testEnabled: () => getCurrentDataGrid()?.getGrider()?.editable,
    onClick: () => getCurrentDataGrid().cloneRows(),
  });

  registerCommand({
    id: 'dataGrid.setNull',
    category: 'Data grid',
    name: _t('command.datagrid.setNull', { defaultMessage: 'Set NULL' }),
    keyText: 'CtrlOrCommand+0',
    testEnabled: () =>
      getCurrentDataGrid()?.getGrider()?.editable && !getCurrentDataGrid()?.getEditorTypes()?.supportFieldRemoval,
    onClick: () => getCurrentDataGrid().setFixedValue(null),
  });

  registerCommand({
    id: 'dataGrid.removeField',
    category: 'Data grid',
    name: _t('command.datagrid.removeField', { defaultMessage: 'Remove field' }),
    keyText: 'CtrlOrCommand+0',
    testEnabled: () =>
      getCurrentDataGrid()?.getGrider()?.editable && getCurrentDataGrid()?.getEditorTypes()?.supportFieldRemoval,
    onClick: () => getCurrentDataGrid().setFixedValue(undefined),
  });

  registerCommand({
    id: 'dataGrid.undo',
    category: 'Data grid',
    name: _t('command.datagrid.undo', { defaultMessage: 'Undo' }),
    group: 'undo',
    icon: 'icon undo',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentDataGrid()?.getGrider()?.canUndo,
    onClick: () => getCurrentDataGrid().undo(),
  });

  registerCommand({
    id: 'dataGrid.redo',
    category: 'Data grid',
    name: _t('command.datagrid.redo', { defaultMessage: 'Redo' }),
    group: 'redo',
    icon: 'icon redo',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentDataGrid()?.getGrider()?.canRedo,
    onClick: () => getCurrentDataGrid().redo(),
  });

  registerCommand({
    id: 'dataGrid.reconnect',
    category: 'Data grid',
    name: _t('command.datagrid.reconnect', { defaultMessage: 'Reconnect' }),
    testEnabled: () => getCurrentDataGrid() != null,
    onClick: () => getCurrentDataGrid().reconnect(),
  });

  registerCommand({
    id: 'dataGrid.copyToClipboard',
    category: 'Data grid',
    name: _t('command.datagrid.copyToClipboard', { defaultMessage: 'Copy to clipboard' }),
    keyText: 'CtrlOrCommand+C',
    disableHandleKeyText: 'CtrlOrCommand+C',
    testEnabled: () => getCurrentDataGrid() != null,
    onClick: () => getCurrentDataGrid().copyToClipboard(),
  });

  registerCommand({
    id: 'dataGrid.editJsonDocument',
    category: 'Data grid',
    keyText: 'CtrlOrCommand+J',
    name: _t('command.datagrid.editJsonDocument', { defaultMessage: 'Edit row as JSON document' }),
    testEnabled: () => getCurrentDataGrid()?.editJsonEnabled(),
    onClick: () => getCurrentDataGrid().editJsonDocument(),
  });

  registerCommand({
    id: 'dataGrid.openSelectionInMap',
    category: 'Data grid',
    name: _t('command.datagrid.openSelectionInMap', { defaultMessage: 'Open selection in map' }),
    testEnabled: () => getCurrentDataGrid() != null,
    onClick: () => getCurrentDataGrid().openSelectionInMap(),
  });

  registerCommand({
    id: 'dataGrid.viewJsonDocument',
    category: 'Data grid',
    name: _t('command.datagrid.viewJsonDocument', { defaultMessage: 'View row as JSON document' }),
    testEnabled: () => getCurrentDataGrid()?.viewJsonDocumentEnabled(),
    onClick: () => getCurrentDataGrid().viewJsonDocument(),
  });

  registerCommand({
    id: 'dataGrid.viewJsonValue',
    category: 'Data grid',
    name: _t('command.datagrid.viewJsonValue', { defaultMessage: 'View cell as JSON document' }),
    testEnabled: () => getCurrentDataGrid()?.viewJsonValueEnabled(),
    onClick: () => getCurrentDataGrid().viewJsonValue(),
  });

  registerCommand({
    id: 'dataGrid.openJsonArrayInSheet',
    category: 'Data grid',
    name: _t('command.datagrid.openJsonArrayInSheet', { defaultMessage: 'Open array as table' }),
    testEnabled: () => getCurrentDataGrid()?.openJsonArrayInSheetEnabled(),
    onClick: () => getCurrentDataGrid().openJsonArrayInSheet(),
  });

  registerCommand({
    id: 'dataGrid.saveCellToFile',
    category: 'Data grid',
    name: _t('command.datagrid.saveCellToFile', { defaultMessage: 'Save cell to file' }),
    testEnabled: () => getCurrentDataGrid()?.saveCellToFileEnabled(),
    onClick: () => getCurrentDataGrid().saveCellToFile(),
  });

  registerCommand({
    id: 'dataGrid.loadCellFromFile',
    category: 'Data grid',
    name: _t('command.datagrid.loadCellFromFile', { defaultMessage: 'Load cell from file' }),
    testEnabled: () => getCurrentDataGrid()?.loadCellFromFileEnabled(),
    onClick: () => getCurrentDataGrid().loadCellFromFile(),
  });

  // registerCommand({
  //   id: 'dataGrid.copyJsonDocument',
  //   category: 'Data grid',
  //   name: 'Copy row as JSON document',
  //   testEnabled: () => getCurrentDataGrid()?.copyJsonEnabled(),
  //   onClick: () => getCurrentDataGrid().copyJsonDocument(),
  // });
  //
  //
  registerCommand({
    id: 'dataGrid.filterSelected',
    category: 'Data grid',
    name: 'Filter selected value',
    keyText: 'CtrlOrCommand+Shift+F',
    testEnabled: () => getCurrentDataGrid()?.getDisplay().filterable,
    onClick: () => getCurrentDataGrid().filterSelectedValue(),
  });
  registerCommand({
    id: 'dataGrid.findColumn',
    category: 'Data grid',
    name: 'Find column',
    keyText: 'CtrlOrCommand+F',
    testEnabled: () => getCurrentDataGrid() != null,
    getSubCommands: () => getCurrentDataGrid().buildFindMenu(),
  });
  registerCommand({
    id: 'dataGrid.hideColumn',
    category: 'Data grid',
    name: 'Hide column',
    keyText: isMac() ? 'Alt+Command+F' : 'CtrlOrCommand+H',
    testEnabled: () => getCurrentDataGrid()?.canShowLeftPanel(),
    onClick: () => getCurrentDataGrid().hideColumn(),
  });
  registerCommand({
    id: 'dataGrid.clearFilter',
    category: 'Data grid',
    name: 'Clear filter',
    keyText: 'CtrlOrCommand+Shift+E',
    testEnabled: () => getCurrentDataGrid()?.clearFilterEnabled(),
    onClick: () => getCurrentDataGrid().clearFilter(),
  });
  registerCommand({
    id: 'dataGrid.generateSqlFromData',
    category: 'Data grid',
    name: 'Generate SQL',
    keyText: 'CtrlOrCommand+G',
    testEnabled: () => getCurrentDataGrid()?.generateSqlFromDataEnabled(),
    onClick: () => getCurrentDataGrid().generateSqlFromData(),
  });
  registerCommand({
    id: 'dataGrid.openFreeTable',
    category: 'Data grid',
    name: 'Edit selection as table',
    testEnabled: () => getCurrentDataGrid() != null,
    onClick: () => getCurrentDataGrid().openFreeTable(),
  });
  registerCommand({
    id: 'dataGrid.openChartFromSelection',
    category: 'Data grid',
    name: 'Open chart from selection',
    testEnabled: () => getCurrentDataGrid() != null,
    onClick: () => getCurrentDataGrid().openChartFromSelection(),
  });
  registerCommand({
    id: 'dataGrid.newJson',
    category: 'Data grid',
    name: 'Add JSON document',
    testEnabled: () => getCurrentDataGrid()?.addJsonDocumentEnabled(),
    onClick: () => getCurrentDataGrid().addJsonDocument(),
  });
  registerCommand({
    id: 'dataGrid.editCellValue',
    category: 'Data grid',
    name: 'Edit cell value',
    testEnabled: () => getCurrentDataGrid()?.editCellValueEnabled(),
    onClick: () => getCurrentDataGrid().editCellValue(),
  });
  registerCommand({
    id: 'dataGrid.mergeSelectedCellsIntoMirror',
    category: 'Data grid',
    name: 'Merge selected cells',
    testEnabled: () => getCurrentDataGrid()?.mirrorWriteEnabled(true),
    onClick: () => getCurrentDataGrid().mergeSelectionIntoMirror({ mergeMode: 'merge', fullRows: false }),
  });
  registerCommand({
    id: 'dataGrid.mergeSelectedRowsIntoMirror',
    category: 'Data grid',
    name: 'Merge selected rows',
    testEnabled: () => getCurrentDataGrid()?.mirrorWriteEnabled(true),
    onClick: () => getCurrentDataGrid().mergeSelectionIntoMirror({ mergeMode: 'merge', fullRows: true }),
  });
  registerCommand({
    id: 'dataGrid.appendSelectedCellsIntoMirror',
    category: 'Data grid',
    name: 'Append selected cells',
    testEnabled: () => getCurrentDataGrid()?.mirrorWriteEnabled(true),
    onClick: () => getCurrentDataGrid().mergeSelectionIntoMirror({ mergeMode: 'append', fullRows: false }),
  });
  registerCommand({
    id: 'dataGrid.appendSelectedRowsIntoMirror',
    category: 'Data grid',
    name: 'Append selected rows',
    testEnabled: () => getCurrentDataGrid()?.mirrorWriteEnabled(true),
    onClick: () => getCurrentDataGrid().mergeSelectionIntoMirror({ mergeMode: 'append', fullRows: true }),
  });
  registerCommand({
    id: 'dataGrid.replaceSelectedCellsIntoMirror',
    category: 'Data grid',
    name: 'Replace with selected cells',
    testEnabled: () => getCurrentDataGrid()?.mirrorWriteEnabled(true),
    onClick: () => getCurrentDataGrid().mergeSelectionIntoMirror({ mergeMode: 'replace', fullRows: false }),
  });
  registerCommand({
    id: 'dataGrid.replaceSelectedRowsIntoMirror',
    category: 'Data grid',
    name: 'Replace with selected rows',
    testEnabled: () => getCurrentDataGrid()?.mirrorWriteEnabled(true),
    onClick: () => getCurrentDataGrid().mergeSelectionIntoMirror({ mergeMode: 'replace', fullRows: true }),
  });

  function getSelectedCellsInfo(selectedCells, grider, realColumnUniqueNames, selectedRowData) {
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
      let rowCount = selectedRowData.length;
      return `Rows: ${rowCount.toLocaleString()}, Count: ${count.toLocaleString()}, Sum:${sum.toLocaleString()}`;
    }
    return null;
  }
</script>

<script lang="ts">
  import { GridDisplay } from 'dbgate-datalib';
  import {
    driverBase,
    parseCellValue,
    detectSqlFilterBehaviour,
    stringifyCellValue,
    shouldOpenMultilineDialog,
  } from 'dbgate-tools';
  import { getContext, onDestroy } from 'svelte';
  import _, { map } from 'lodash';
  import registerCommand from '../commands/registerCommand';
  import ColumnHeaderControl from './ColumnHeaderControl.svelte';
  import DataGridRow from './DataGridRow.svelte';
  import { getFilterValueExpression } from 'dbgate-filterparser';
  import stableStringify from 'json-stable-stringify';
  import contextMenu, { getContextMenu, registerMenu } from '../utility/contextMenu';
  import { tick } from 'svelte';
  import {
    cellIsSelected,
    countColumnSizes,
    countVisibleRealColumns,
    filterCellForRow,
    filterCellsForRow,
  } from './gridutil';
  import HorizontalScrollBar from './HorizontalScrollBar.svelte';
  import { cellFromEvent, emptyCellArray, getCellRange, isRegularCell, nullCell, topLeftCell } from './selection';
  import VerticalScrollBar from './VerticalScrollBar.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import DataFilterControl from './DataFilterControl.svelte';
  import createReducer from '../utility/createReducer';
  import keycodes from '../utility/keycodes';
  import { copyRowsFormat, currentArchive, selectedCellsCallback } from '../stores';
  import {
    copyRowsFormatDefs,
    copyRowsToClipboard,
    copyTextToClipboard,
    extractRowCopiedValue,
  } from '../utility/clipboard';
  import invalidateCommands from '../commands/invalidateCommands';
  import createRef from '../utility/createRef';
  import openReferenceForm, { openPrimaryKeyForm } from '../formview/openReferenceForm';
  import openNewTab from '../utility/openNewTab';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import { dataGridRowHeight } from './DataGridRowHeightMeter.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { editJsonRowDocument } from '../formview/CollectionJsonRow.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import CollapseButton from './CollapseButton.svelte';
  import GenerateSqlFromDataModal from '../modals/GenerateSqlFromDataModal.svelte';
  import { showModal } from '../modals/modalTools';
  import StatusBarTabItem from '../widgets/StatusBarTabItem.svelte';
  import { findCommand } from '../commands/runCommand';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';
  import EditJsonModal from '../modals/EditJsonModal.svelte';
  import { apiCall } from '../utility/api';
  import getElectron from '../utility/getElectron';
  import { isCtrlOrCommandKey, isMac } from '../utility/common';
  import { createGeoJsonFromSelection, selectionCouldBeShownOnMap } from '../elements/SelectionMapView.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import EditCellDataModal from '../modals/EditCellDataModal.svelte';
  import { getDatabaseInfo, useDatabaseStatus, useSettings } from '../utility/metadataLoaders';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import { openJsonLinesData } from '../utility/openJsonLinesData';
  import contextMenuActivator from '../utility/contextMenuActivator';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { _t } from '../translations';

  export let onLoadNextData = undefined;
  export let grider = undefined;
  export let display: GridDisplay = undefined;
  export let conid = undefined;
  export let database = undefined;
  export let frameSelection = undefined;
  export let isLoading = false;
  export let allRowCount = undefined;
  export let onReferenceSourceChanged = undefined;
  export let onPublishedCellsChanged = undefined;
  export let onReferenceClick = undefined;
  export let onChangeSelectedColumns = undefined;
  // export let onSelectedCellsPublishedChanged = undefined;
  export let focusOnVisible = false;
  export let formViewAvailable = false;
  export let errorMessage = undefined;
  export let pureName = undefined;
  export let schemaName = undefined;
  export let allowDefineVirtualReferences = false;
  export let formatterFunction;

  export let isLoadedAll;
  export let loadedTime;
  export let changeSetStore;
  export let isDynamicStructure = false;
  // export let selectedCellsPublished = () => [];
  export let collapsedLeftColumnStore;
  export let multipleGridsOnTab = false;
  export let tabControlHiddenTab = false;
  export let onCustomGridRefresh = null;
  export let onOpenQuery = null;
  export let onOpenQueryOnError = null;
  export let jslid;
  // export let generalAllowSave = false;
  export let hideGridLeftColumn = false;

  export const activator = createActivator('DataGridCore', false);

  export let dataEditorTypesBehaviourOverride = null;

  const wheelRowCount = 5;
  const tabFocused: any = getContext('tabFocused');

  let containerHeight = 0;
  let containerWidth = 0;
  $: rowHeight = $dataGridRowHeight;
  let firstVisibleRowScrollIndex = 0;
  let firstVisibleColumnScrollIndex = 0;

  let domFocusField;
  let domHorizontalScroll;
  let domVerticalScroll;
  let domContainer;

  let currentCell = topLeftCell;
  let selectedCells = [topLeftCell];
  let dragStartCell = nullCell;
  let shiftDragStartCell = nullCell;
  let autofillDragStartCell = nullCell;
  let autofillSelectedCells = emptyCellArray;
  const domFilterControlsRef = createRef({});

  let isGridFocused = false;

  const tabid = getContext('tabid');

  let unsubscribeDbRefresh;

  onDestroy(callUnsubscribeDbRefresh);

  function callUnsubscribeDbRefresh() {
    if (unsubscribeDbRefresh) {
      unsubscribeDbRefresh();
      unsubscribeDbRefresh = null;
    }
  }

  async function refreshAndUnsubscribe(status) {
    if (status?.name != 'pending' && status?.name != 'checkStructure' && status?.name != 'loadStructure') {
      callUnsubscribeDbRefresh();
      // ensure new structure is loaded
      await getDatabaseInfo({ conid, database });
      refresh();
    }
  }

  const settingsValue = useSettings();

  $: gridColoringMode = $settingsValue?.['dataGrid.coloringMode'];

  export function refresh() {
    if (onCustomGridRefresh) onCustomGridRefresh();
    else display.reload();
  }

  export function canRefresh() {
    if (onCustomGridRefresh) return true;
    return getDisplay()?.supportsReload;
  }

  export function canDeepRefresh() {
    return canRefresh() && !!conid && !!database;
  }

  export async function deepRefresh() {
    callUnsubscribeDbRefresh();
    await apiCall('database-connections/sync-model', { conid, database });
    unsubscribeDbRefresh = useDatabaseStatus({ conid, database }).subscribe(refreshAndUnsubscribe);
  }

  export function getGrider() {
    return grider;
  }

  export function getChangeSetStore() {
    return changeSetStore;
  }

  export function getDisplay() {
    return display;
  }

  export function revertRowChanges() {
    grider.beginUpdate();
    for (const index of getSelectedRowIndexes()) {
      if (_.isNumber(index)) grider.revertRowChanges(index);
    }
    grider.endUpdate();
  }

  export function revertAllChanges() {
    grider.revertAllChanges();
  }

  export function deleteSelectedRows() {
    grider.beginUpdate();
    for (const index of _.sortBy(getSelectedRowIndexes(), x => -x)) {
      if (_.isNumber(index)) grider.deleteRow(index);
    }
    grider.endUpdate();
  }

  export function addNewColumnEnabled() {
    return getGrider()?.editable && isDynamicStructure;
  }

  export function addNewColumn() {
    showModal(InputTextModal, {
      value: '',
      label: 'Column name',
      header: 'Add new column',
      onConfirm: name => {
        display.addDynamicColumn(name);
        tick().then(() => {
          display.focusColumns([name]);
        });
      },
    });
  }

  export async function insertNewRow() {
    if (!grider.canInsert) return;
    const rowIndex = grider.insertRow();
    const cell = [rowIndex, (currentCell && currentCell[1]) || 0];
    // @ts-ignore
    currentCell = cell;
    // @ts-ignore
    selectedCells = [cell];
    await tick();
    scrollIntoView(cell);
    domFocusField?.focus();
  }

  export async function cloneRows() {
    if (!grider.canInsert) return;

    let rowIndex = null;
    grider.beginUpdate();
    for (const index of _.sortBy(getSelectedRowIndexes(), x => x)) {
      if (_.isNumber(index)) {
        rowIndex = grider.insertRow();

        for (const column of display.columns) {
          if (column.uniquePath.length > 1) continue;
          if (column.autoIncrement) continue;
          if (column.isClusterKey) continue;

          grider.setCellValue(rowIndex, column.uniqueName, grider.getRowData(index)[column.uniqueName]);
        }
      }
    }
    grider.endUpdate();

    if (rowIndex == null) return;
    const cell = [rowIndex, (currentCell && currentCell[1]) || 0];
    // @ts-ignore
    currentCell = cell;
    // @ts-ignore
    selectedCells = [cell];
    await tick();
    scrollIntoView(cell);
  }

  export function setFixedValue(value) {
    grider.beginUpdate();
    selectedCells.filter(isRegularCell).forEach(cell => {
      setCellValue(cell, value);
    });
    grider.endUpdate();
  }

  export function undo() {
    grider.undo();
  }

  export function redo() {
    grider.redo();
  }

  export async function reconnect() {
    await apiCall('database-connections/refresh', { conid, database });
    display.reload();
  }

  function copyToClipboardCore(format) {
    const cells = cellsToRegularCells(selectedCells);
    const rowIndexes = _.sortBy(_.uniq(cells.map(x => x[0])));
    const colIndexes = _.sortBy(_.uniq(cells.map(x => x[1])));
    const rows = rowIndexes.map(rowIndex => grider.getRowData(rowIndex));
    // @ts-ignore
    const columns = colIndexes.map(col => realColumnUniqueNames[col]);
    copyRowsToClipboard(format, columns, rows, {
      schemaName,
      pureName: pureName || 'target',
      driver: display?.driver || driverBase,
      keyColumns: display?.baseTable?.primaryKey?.columns?.map(col => col.columnName) || [
        display?.columns ? display?.columns[0].columnName : columns[0],
      ],
    });
    if (domFocusField) domFocusField.focus();
  }

  export function copyToClipboard() {
    copyToClipboardCore($copyRowsFormat);
  }

  export function loadNextDataIfNeeded() {
    if (onLoadNextData && firstVisibleRowScrollIndex + visibleRowCountUpperBound >= grider.rowCount) {
      onLoadNextData();
    }
  }

  export function filterSelectedValue() {
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

  export function clearFilter() {
    display.clearFilters();
  }

  export function clearFilterEnabled() {
    return display.filterCount > 0;
  }

  export function openFreeTable() {
    openJsonLinesData(getSelectedFreeDataRows());
  }

  export function openChartFromSelection() {
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
  }

  export function viewJsonDocumentEnabled() {
    return isDynamicStructure && _.uniq(selectedCells.map(x => x[0])).length == 1;
  }

  export function viewJsonDocument() {
    const rowIndex = selectedCells[0][0];
    const json = grider.getRowData(rowIndex);
    openJsonDocument(json);
  }

  export function openSelectionInMap() {
    const selection = getCellsPublished(selectedCells);
    if (!selectionCouldBeShownOnMap(selection)) {
      showModal(ErrorMessageModal, { message: 'There is nothing to be shown on map' });
      return;
    }

    const geoJson = createGeoJsonFromSelection(selection);
    if (!geoJson) {
      showModal(ErrorMessageModal, { message: 'There is nothing to be shown on map' });
      return;
    }

    openNewTab(
      {
        title: 'Map',
        icon: 'img map',
        tabComponent: 'MapTab',
      },
      { editor: geoJson }
    );
    return;
  }

  function getSelectedExportableCell() {
    const electron = getElectron();
    if (electron && selectedCells.length == 1) {
      const cell = selectedCells[0];
      const rowData = grider.getRowData(cell[0]);
      if (!rowData) return null;
      const cellData = rowData[realColumnUniqueNames[cell[1]]];
      return cellData;
    }
  }

  export function saveCellToFileEnabled() {
    const value = getSelectedExportableCell();
    return _.isString(value) || (value?.type == 'Buffer' && _.isArray(value?.data));
  }

  export async function saveCellToFile() {
    const electron = getElectron();
    const file = await electron.showSaveDialog({});
    if (file) {
      const fs = window.require('fs');
      const value = getSelectedExportableCell();
      if (_.isString(value)) {
        fs.promises.writeFile(file, value);
      } else if (value?.type == 'Buffer' && _.isArray(value?.data)) {
        fs.promises.writeFile(file, window['Buffer'].from(value.data));
      }
    }
  }

  export function loadCellFromFileEnabled() {
    const electron = getElectron();
    return electron && selectedCells.length == 1 && isRegularCell(selectedCells[0]);
  }

  export async function loadCellFromFile() {
    const electron = getElectron();
    const files = await electron.showOpenDialog({
      properties: ['showHiddenFiles', 'openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    const file = files && files[0];
    if (file) {
      const fs = window.require('fs');
      const isText = file.endsWith('.json') || file.endsWith('.txt') || file.endsWith('.html') || file.endsWith('.xml');
      const data = await fs.promises.readFile(file, isText ? { encoding: 'utf-8' } : null);
      setCellValue(
        selectedCells[0],
        isText
          ? data
          : {
              type: 'Buffer',
              data: [...data],
            }
      );
    }
  }

  function getSelectedDataJson(forceArray = false) {
    const cells = cellsToRegularCells(selectedCells);
    const data = cells.map(cell => {
      const rowData = grider.getRowData(cell[0]);
      if (!rowData) return null;
      return rowData[realColumnUniqueNames[cell[1]]];
    });
    if (!data.every(x => _.isArray(x) || _.isPlainObject(x))) return null;
    if (data.length == 0) return null;
    if (data.length == 1 && _.isPlainObject(data[0]) && !forceArray) return data[0];
    return _.flatten(data);
  }

  export function viewJsonValueEnabled() {
    return getSelectedDataJson() != null;
  }

  export function viewJsonValue() {
    openJsonDocument(getSelectedDataJson());
  }

  export function openJsonArrayInSheetEnabled() {
    return getSelectedDataJson() != null;
  }

  export function openJsonArrayInSheet() {
    openJsonLinesData(getSelectedDataJson(true));
  }

  export function editJsonEnabled() {
    return grider.editable && _.uniq(selectedCells.map(x => x[0])).length == 1;
  }

  export function editJsonDocument() {
    const rowIndex = selectedCells[0][0];
    editJsonRowDocument(grider, rowIndex);
  }

  export function editCellValueEnabled() {
    return grider.editable && selectedCells.length == 1;
  }

  export function editCellValue() {
    if (!currentCell) return false;
    const rowData = grider.getRowData(currentCell[0]);
    if (!rowData) return null;
    const cellData = rowData[realColumnUniqueNames[currentCell[1]]];

    showModal(EditCellDataModal, {
      value: cellData,
      dataEditorTypesBehaviour: getEditorTypes(),
      onSave: value => grider.setCellValue(currentCell[0], realColumnUniqueNames[currentCell[1]], value),
    });
  }

  export function getEditorTypes() {
    return dataEditorTypesBehaviourOverride ?? display?.driver?.dataEditorTypesBehaviour;
  }

  export function addJsonDocumentEnabled() {
    return grider.editable;
  }

  export function addJsonDocument() {
    showModal(EditJsonModal, {
      showPasteInfo: true,
      onSave: value => {
        grider.insertDocuments(_.isArray(value) ? value : [value]);
        return true;
      },
    });
  }

  // export function copyJsonEnabled() {
  //   return isDynamicStructure && _.uniq(selectedCells.map(x => x[0])).length == 1;
  // }

  // export function copyJsonDocument() {
  //   const rowIndex = selectedCells[0][0];
  //   const rowData = grider.getRowData(rowIndex);
  //   copyTextToClipboard(JSON.stringify(rowData, undefined, 2));
  // }

  export function buildFindMenu() {
    const res = [];

    async function clickColumn(uniquePath) {
      display.setColumnVisibility(uniquePath, true);
      await tick();
      const invMap = _.invert(realColumnUniqueNames);
      const colIndex = invMap[uniquePath.join('.')];
      scrollIntoView([null, colIndex]);

      currentCell = [currentCell[0], parseInt(colIndex)];
      selectedCells = [currentCell];
    }

    for (const column of display.columns) {
      if (column.uniquePath.length > 1) continue;

      res.push({
        text: column.columnName,
        icon: 'img column',
        onClick: async () => {
          clickColumn(column.uniquePath);
        },
      });
    }
    for (const column of display.columns) {
      if (column.uniquePath.length > 1) continue;
      if (column.isExpandable) {
        const table = display.getFkTarget(column);
        if (!table) continue;

        for (const childColumn of table.columns) {
          res.push({
            text: `${column.columnName}.${childColumn.columnName}`,
            icon: 'img column',
            onClick: async () => {
              display.toggleExpandedColumn(column.uniqueName, true);
              clickColumn([...column.uniquePath, childColumn.columnName]);
            },
          });
        }
      }
    }

    for (const fk of display?.baseTable?.foreignKeys || []) {
      res.push({
        text: `${fk.refTableName} (${fk.columns.map(x => x.columnName).join(', ')})`,
        icon: 'img link',
        onClick: () => {
          onReferenceClick({
            schemaName: fk.refSchemaName,
            pureName: fk.refTableName,
            columns: fk.columns.map(col => ({
              baseName: col.columnName,
              refName: col.refColumnName,
            })),
          });
        },
      });
    }

    for (const fk of display?.baseTable?.dependencies || []) {
      res.push({
        text: `${fk.pureName} (${fk.columns.map(x => x.columnName).join(', ')})`,
        icon: 'img reference',
        onClick: () => {
          onReferenceClick({
            schemaName: fk.schemaName,
            pureName: fk.pureName,
            columns: fk.columns.map(col => ({
              baseName: col.refColumnName,
              refName: col.columnName,
            })),
          });
        },
      });
    }

    return res;
  }

  export function hideColumn() {
    const columnIndexes = _.uniq(selectedCells.map(x => x[1]));
    for (const index of columnIndexes) {
      const name = realColumnUniqueNames[index];
      const column = display.allColumns.find(x => x.uniqueName == name);
      if (column) {
        display.setColumnVisibility(column.uniquePath, false);
      }
    }
    // selectedCells = [currentCell];
  }

  export function generateSqlFromDataEnabled() {
    return !!display?.baseTable;
  }

  export function generateSqlFromData() {
    const columnIndexes = _.uniq(selectedCells.map(x => x[1]));
    columnIndexes.sort((a, b) => a - b);

    showModal(GenerateSqlFromDataModal, {
      rows: getSelectedRowData(),
      allColumns: display.baseTable.columns.map(x => x.columnName),
      selectedColumns: columnIndexes.map(x => realColumnUniqueNames[x]),
      keyColumns: display?.baseTable?.primaryKey?.columns?.map(x => x.columnName) || [
        display.baseTable.columns[0].columnName,
      ],
      engineDriver: display?.driver,
      tableInfo: display.baseTable,
    });
  }

  export function mirrorWriteEnabled(requireKey) {
    return requireKey ? !!display.baseTable?.primaryKey || !!display.baseCollection : !!display.baseTableOrSimilar;
  }

  export async function mergeSelectionIntoMirror({ fullRows, mergeMode = 'merge' }) {
    const file = display.baseTableOrSimilar?.pureName;
    const mergeKey = display.baseCollection
      ? display.baseCollection?.uniqueKey?.map(x => x.columnName)
      : display.baseTable?.primaryKey.columns.map(x => x.columnName);

    const cells = cellsToRegularCells(selectedCells);
    const rowIndexes = _.sortBy(_.uniq(cells.map(x => x[0])));
    const colIndexes = _.sortBy(_.uniq(cells.map(x => x[1])));
    const rows = rowIndexes.map(rowIndex => grider.getRowData(rowIndex));
    // @ts-ignore
    const columns = colIndexes.map(col => realColumnUniqueNames[col]);
    const mergedRows = fullRows ? rows : rows.map(x => _.pick(x, _.uniq([...columns, ...mergeKey])));

    const res = await apiCall('archive/modify-file', {
      folder: $currentArchive,
      file,
      mergedRows,
      mergeKey,
      mergeMode,
    });
    if (res) {
      showSnackbarSuccess(`Merged ${mergedRows.length} rows into ${file} in archive ${$currentArchive}`);
    }
  }

  export function canShowLeftPanel() {
    return !hideGridLeftColumn;
  }

  $: autofillMarkerCell =
    selectedCells && selectedCells.length > 0 && _.uniq(selectedCells.map(x => x[0])).length == 1
      ? [_.max(selectedCells.map(x => x[0])), _.max(selectedCells.map(x => x[1]))]
      : null;

  // $: firstVisibleRowScrollIndex = 0;
  // $: visibleRowCountUpperBound = 25;

  // $: console.log('grider', grider);
  $: columns = display?.allColumns || [];

  $: columnSizes = countColumnSizes(grider, columns, containerWidth, display);

  $: headerColWidth = 40;

  $: gridScrollAreaHeight = containerHeight - 2 * rowHeight;
  $: gridScrollAreaWidth = containerWidth - columnSizes.frozenSize - headerColWidth - 32;

  $: visibleRowCountUpperBound = Math.ceil(gridScrollAreaHeight / Math.floor(Math.max(1, rowHeight)));
  $: visibleRowCountLowerBound = Math.floor(gridScrollAreaHeight / Math.ceil(Math.max(1, rowHeight)));

  $: visibleRealColumns = countVisibleRealColumns(
    columnSizes,
    firstVisibleColumnScrollIndex,
    gridScrollAreaWidth,
    columns
  );

  $: selectedCellsInfo = getSelectedCellsInfo(selectedCells, grider, realColumnUniqueNames, getSelectedRowData());

  $: databaseStatus = useDatabaseStatus({ conid, database });

  // $: console.log('visibleRealColumns', visibleRealColumns);
  // $: console.log('visibleRowCountUpperBound', visibleRowCountUpperBound);
  // $: console.log('rowHeight', rowHeight);
  // $: console.log('containerHeight', containerHeight);

  // $: console.log('COLUMNS', columns);
  // $: console.log('columnSizes.realCount', columnSizes.realCount);
  // $: console.log('realColumnUniqueNames', realColumnUniqueNames);
  // $: console.log('columnSizes.realCount', columnSizes.realCount);

  $: realColumnUniqueNames = _.range(columnSizes.realCount).map(
    realIndex => (columns[columnSizes.realToModel(realIndex)] || {}).uniqueName
  );

  $: maxScrollColumn = columnSizes.scrollInView(0, columns.length - 1 - columnSizes.frozenCount, gridScrollAreaWidth);

  $: {
    if (onLoadNextData && firstVisibleRowScrollIndex + visibleRowCountUpperBound >= grider.rowCount && rowHeight > 0) {
      onLoadNextData();
    }
  }

  $: {
    tick().then(() => {
      if (display?.focusedColumns?.length > 0) {
        const invMap = _.invert(realColumnUniqueNames);
        const colIndex = invMap[display.focusedColumns[0]];
        if (colIndex) {
          scrollIntoView([null, colIndex]);
        }
      }
    });
  }

  $: {
    const _unused = selectedCells;
    if (onReferenceSourceChanged && (grider.rowCount > 0 || isLoadedAll)) {
      onReferenceSourceChanged(getSelectedRowData(), loadedTime);
    }
  }

  // $: console.log('DISPLAY.config', display.config);
  $: {
    if (display?.groupColumns && display?.baseTableOrSimilar && onReferenceClick) {
      onReferenceClick({
        referenceId: stableStringify(display && display.groupColumns),
        schemaName: display.baseTableOrSimilar?.schemaName,
        pureName: display.baseTableOrSimilar?.pureName,
        columns: display.groupColumns.map(col => ({
          baseName: col,
          refName: col,
          dataType: _.get(
            display.baseTableOrView?.columns?.find(x => x.columnName == col),
            'dataType'
          ),
        })),
      });
    }
  }

  $: if ($tabFocused && domFocusField && focusOnVisible) {
    domFocusField.focus();
  }

  const lastPublishledSelectedCellsRef = createRef('');
  const changeSetValueRef = createRef(null);
  $: {
    const stringified = stableStringify(selectedCells);
    if (
      (lastPublishledSelectedCellsRef.get() != stringified || changeSetValueRef.get() != $changeSetStore?.value) &&
      realColumnUniqueNames?.length > 0
    ) {
      tick().then(() => {
        const rowIndexes = _.uniq(selectedCells.map(x => x[0]));
        if (rowIndexes.every(x => grider.getRowData(x))) {
          lastPublishledSelectedCellsRef.set(stringified);
          changeSetValueRef.set($changeSetStore?.value);
          $selectedCellsCallback = () => getCellsPublished(selectedCells);

          if (onChangeSelectedColumns) {
            onChangeSelectedColumns(getSelectedColumns().map(x => x.columnName));
          }

          if (onPublishedCellsChanged) {
            onPublishedCellsChanged(getCellsPublished(selectedCells));
          }
        }
      });
    }
  }

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

  const getSelectedFreeDataRows = () => {
    const columns = getSelectedColumns();
    const rows = getSelectedRowData().map(row => _.pickBy(row, (v, col) => columns.find(x => x.columnName == col)));
    return rows;
  };

  function getCellsPublished(cells) {
    const regular = cellsToRegularCells(cells);
    const res = regular
      .map(cell => {
        const row = cell[0];
        const rowData = grider.getRowData(row);
        const column = realColumnUniqueNames[cell[1]];
        return {
          row,
          rowData,
          column,
          value: rowData && rowData[column],
          engine: display?.driver,
          condition: display?.getChangeSetCondition(rowData),
          insertedRowIndex: grider?.getInsertedRowIndex(row),
        };
      })
      .filter(x => x.column);
    return res;
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
        firstVisibleRowScrollIndex = newRow;
        domVerticalScroll.scroll(newRow);
      }
    }

    if (col != null) {
      if (col >= columnSizes.frozenCount) {
        let newColumn = columnSizes.scrollInView(
          firstVisibleColumnScrollIndex,
          col - columnSizes.frozenCount,
          gridScrollAreaWidth
        );
        firstVisibleColumnScrollIndex = newColumn;

        domHorizontalScroll.scroll(newColumn);
      }
    }
  }

  function handleGridMouseDown(event) {
    if (event.target.closest('.buttonLike')) return;
    if (event.target.closest('.resizeHandleControl')) return;
    if (event.target.closest('.collapseButtonMarker')) return;
    if (event.target.closest('.showFormButtonMarker')) return;
    if (event.target.closest('.inplaceeditor-container')) return;
    if (event.target.closest('input')) return;

    shiftDragStartCell = null;
    // event.target.closest('table').focus();
    event.preventDefault();
    if (domFocusField) domFocusField.focus();
    const cell = cellFromEvent(event);

    if (event.button == 2) {
      if (cell && !cellIsSelected(cell[0], cell[1], selectedCells)) {
        selectedCells = [cell];
      }
      return;
    }

    const autofill = event.target.closest('div.autofillHandleMarker');
    if (autofill) {
      autofillDragStartCell = cell;
    } else {
      const oldCurrentCell = currentCell;
      currentCell = cell;

      if (isCtrlOrCommandKey(event)) {
        if (isRegularCell(cell)) {
          if (selectedCells.find(x => x[0] == cell[0] && x[1] == cell[1])) {
            selectedCells = selectedCells.filter(x => x[0] != cell[0] || x[1] != cell[1]);
          } else {
            selectedCells = [...selectedCells, cell];
          }
        }
      } else if (event.shiftKey) {
        selectedCells = getCellRange(oldCurrentCell, cell);
      } else {
        selectedCells = getCellRange(cell, cell);
        dragStartCell = cell;

        if (isRegularCell(cell) && !_.isEqual(cell, $inplaceEditorState.cell) && _.isEqual(cell, oldCurrentCell)) {
          if (!showMultilineCellEditorConditional(cell)) {
            dispatchInsplaceEditor({ type: 'show', cell, selectAll: true });
          }
        } else if (!_.isEqual(cell, $inplaceEditorState.cell)) {
          dispatchInsplaceEditor({ type: 'close' });
        }
      }
    }

    if (display.focusedColumns) display.focusColumns(null);
  }

  function handleBlur() {
    shiftDragStartCell = null;
    dragStartCell = null;
  }

  function showMultilineCellEditorConditional(cell) {
    if (!cell) return false;
    const rowData = grider.getRowData(cell[0]);
    if (!rowData) return null;
    const cellData = rowData[realColumnUniqueNames[cell[1]]];
    if (shouldOpenMultilineDialog(cellData)) {
      showModal(EditCellDataModal, {
        dataEditorTypesBehaviour: getEditorTypes(),
        value: cellData,
        onSave: value => grider.setCellValue(cell[0], realColumnUniqueNames[cell[1]], value),
      });
      return true;
    }
    return false;
  }

  function handleGridMouseMove(event) {
    if (autofillDragStartCell) {
      const cell = cellFromEvent(event);
      if (isRegularCell(cell) && (cell[0] == autofillDragStartCell[0] || cell[1] == autofillDragStartCell[1])) {
        const autoFillStart = [selectedCells[0][0], _.min(selectedCells.map(x => x[1]))];
        // @ts-ignore
        autofillSelectedCells = getCellRange(autoFillStart, cell);
      }
    } else if (dragStartCell) {
      const cell = cellFromEvent(event);
      currentCell = cell;
      selectedCells = getCellRange(dragStartCell, cell);
    }
  }

  function handleGridMouseUp(event) {
    if (dragStartCell) {
      const cell = cellFromEvent(event);
      currentCell = cell;
      selectedCells = getCellRange(dragStartCell, cell);
      dragStartCell = null;
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

      autofillDragStartCell = null;
      autofillSelectedCells = [];
      selectedCells = autofillSelectedCells;
    }
  }

  function handleGridWheel(event) {
    if (event.shiftKey) {
      scrollHorizontal(event.deltaY, event.deltaX);
    } else {
      scrollHorizontal(event.deltaX, event.deltaY);
      scrollVertical(event.deltaX, event.deltaY);
    }
  }

  function scrollVertical(deltaX, deltaY) {
    let newFirstVisibleRowScrollIndex = firstVisibleRowScrollIndex;
    if (deltaY > 0 && deltaX === -0) {
      newFirstVisibleRowScrollIndex += wheelRowCount;
    } else if (deltaY < 0 && deltaX === -0) {
      newFirstVisibleRowScrollIndex -= wheelRowCount;
    }

    let rowCount = grider.rowCount;
    if (newFirstVisibleRowScrollIndex + visibleRowCountLowerBound > rowCount) {
      newFirstVisibleRowScrollIndex = rowCount - visibleRowCountLowerBound + 1;
    }
    if (newFirstVisibleRowScrollIndex < 0) {
      newFirstVisibleRowScrollIndex = 0;
    }

    firstVisibleRowScrollIndex = newFirstVisibleRowScrollIndex;
    domVerticalScroll.scroll(newFirstVisibleRowScrollIndex);
  }

  function scrollHorizontal(deltaX, deltaY) {
    let newFirstVisibleColumnScrollIndex = firstVisibleColumnScrollIndex;
    if (deltaX > 0 && deltaY === -0) {
      newFirstVisibleColumnScrollIndex++;
    } else if (deltaX < 0 && deltaY === -0) {
      newFirstVisibleColumnScrollIndex--;
    }

    if (newFirstVisibleColumnScrollIndex > maxScrollColumn) {
      newFirstVisibleColumnScrollIndex = maxScrollColumn;
    }
    if (newFirstVisibleColumnScrollIndex < 0) {
      newFirstVisibleColumnScrollIndex = 0;
    }

    firstVisibleColumnScrollIndex = newFirstVisibleColumnScrollIndex;
    domHorizontalScroll.scroll(newFirstVisibleColumnScrollIndex);
  }

  function getSelectedRowIndexes() {
    if (selectedCells.find(x => x[0] == 'header')) return _.range(0, grider.rowCount);
    return _.uniq((selectedCells || []).map(x => x[0])).filter(x => _.isNumber(x));
  }

  function getSelectedColumnIndexes() {
    if (selectedCells.find(x => x[1] == 'header')) return _.range(0, realColumnUniqueNames.length);
    return _.uniq((selectedCells || []).map(x => x[1])).filter(x => _.isNumber(x));
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

  function handleGridKeyDown(event) {
    if ($inplaceEditorState.cell) return;

    if (
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      ((event.keyCode >= keycodes.a && event.keyCode <= keycodes.z) ||
        (event.keyCode >= keycodes.n0 && event.keyCode <= keycodes.n9) ||
        (event.keyCode >= keycodes.numPad0 && event.keyCode <= keycodes.numPad9) ||
        event.keyCode == keycodes.dash)
    ) {
      // @ts-ignore
      event.preventDefault();
      dispatchInsplaceEditor({ type: 'show', text: event.key, cell: currentCell });
      // console.log('event', event.nativeEvent);
    }

    if (event.keyCode == keycodes.f2 || event.keyCode == keycodes.enter) {
      // @ts-ignore
      if (!showMultilineCellEditorConditional(currentCell)) {
        dispatchInsplaceEditor({ type: 'show', cell: currentCell, selectAll: true });
      }
    }

    if (event.shiftKey) {
      if (!isRegularCell(shiftDragStartCell)) {
        shiftDragStartCell = currentCell;
      }
    } else {
      shiftDragStartCell = nullCell;
    }

    handleCursorMove(event);

    if (
      event.shiftKey &&
      event.keyCode != keycodes.shift &&
      event.keyCode != keycodes.tab &&
      event.keyCode != keycodes.ctrl &&
      event.keyCode != keycodes.leftWindowKey &&
      event.keyCode != keycodes.rightWindowKey &&
      !(
        (event.keyCode >= keycodes.a && event.keyCode <= keycodes.z) ||
        (event.keyCode >= keycodes.n0 && event.keyCode <= keycodes.n9) ||
        (event.keyCode >= keycodes.numPad0 && event.keyCode <= keycodes.numPad9) ||
        event.keyCode == keycodes.dash
      )
    ) {
      selectedCells = getCellRange(shiftDragStartCell || currentCell, currentCell);
    }
  }

  function handleCursorMove(event) {
    if (!isRegularCell(currentCell)) return null;
    let rowCount = grider.rowCount;
    if (isCtrlOrCommandKey(event)) {
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
          selectedCells = [['header', 'header']];
          event.preventDefault();
          return ['header', 'header'];
      }
    } else {
      switch (event.keyCode) {
        case keycodes.upArrow:
          if (currentCell[0] == 0) return focusFilterEditor(currentCell[1]);
          return moveCurrentCell(currentCell[0] - 1, currentCell[1], event);
        case keycodes.downArrow:
          return moveCurrentCell(currentCell[0] + 1, currentCell[1], event);
        case keycodes.enter:
          if (!grider.editable) return moveCurrentCell(currentCell[0] + 1, currentCell[1], event);
          break;
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
        case keycodes.tab: {
          return moveCurrentCellWithTabKey(event.shiftKey);
        }
      }
    }
    return null;
  }

  function moveCurrentCellWithTabKey(isShift) {
    if (!isRegularCell(currentCell)) return null;

    if (isShift) {
      if (currentCell[1] > 0) {
        return moveCurrentCell(currentCell[0], currentCell[1] - 1, event);
      } else {
        return moveCurrentCell(currentCell[0] - 1, columnSizes.realCount - 1, event);
      }
    } else {
      if (currentCell[1] < columnSizes.realCount - 1) {
        return moveCurrentCell(currentCell[0], currentCell[1] + 1, event);
      } else {
        return moveCurrentCell(currentCell[0] + 1, 0, event);
      }
    }
  }

  function setCellValue(cell, value) {
    grider.setCellValue(cell[0], realColumnUniqueNames[cell[1]], value);
  }

  function moveCurrentCell(row, col, event = null) {
    const rowCount = grider.rowCount;

    if (row < 0) row = 0;
    if (row >= rowCount) row = rowCount - 1;
    if (col < 0) col = 0;
    if (col >= columnSizes.realCount) col = columnSizes.realCount - 1;
    currentCell = [row, col];
    // setSelectedCells([...(event.ctrlKey ? selectedCells : []), [row, col]]);
    selectedCells = [[row, col]];
    scrollIntoView([row, col]);
    // this.selectedCells.push(this.currentCell);
    // this.scrollIntoView(this.currentCell);

    if (event) event.preventDefault();
    return [row, col];
  }

  async function handlePaste(event) {
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

    let json = null;
    if (grider.canInsert) {
      try {
        json = JSON.parse(pastedText);
      } catch (e) {
        json = null;
      }
    }

    if (json && (_.isArray(json) || _.isPlainObject(json))) {
      const rowIndex = grider.insertDocuments(_.isArray(json) ? json : [json]);
      const cell = [rowIndex, (currentCell && currentCell[1]) || 0];
      // @ts-ignore
      currentCell = cell;
      // @ts-ignore
      selectedCells = [cell];
      await tick();
      scrollIntoView(cell);
    } else {
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
            setCellValue([rowIndex, colIndex], parseCellValue(cell, getEditorTypes()));
            colIndex += 1;
          }
          rowIndex += 1;
        }
      }
      if (selectedRegular.length > 1) {
        const startRow: number = _.min(selectedRegular.map(x => x[0]));
        const startCol: number = _.min(selectedRegular.map(x => x[1]));
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

  function handleSetFormView(rowData, column) {
    if (column) {
      openReferenceForm(rowData, column, conid, database);
    } else {
      openPrimaryKeyForm(rowData, display.baseTable, conid, database);
    }
  }

  const selectTopmostCell = uniquePath => {
    const modelIndex = columns.findIndex(x => x.uniquePath == uniquePath);
    const realIndex = columnSizes.modelToReal(modelIndex);
    let cell = [firstVisibleRowScrollIndex, realIndex];
    // @ts-ignore
    currentCell = cell;
    // @ts-ignore
    selectedCells = [cell];
    if (domFocusField) domFocusField.focus();
  };

  const [inplaceEditorState, dispatchInsplaceEditor] = createReducer((state, action) => {
    switch (action.type) {
      case 'show':
        if (!grider.editable) return {};
        return {
          cell: action.cell,
          text: action.text,
          selectAll: action.selectAll,
        };
      case 'close': {
        if (domFocusField) domFocusField.focus();
        if (action.mode == 'enter' || action.mode == 'tab' || action.mode == 'shiftTab') {
          setTimeout(() => {
            if (isRegularCell(currentCell)) {
              switch (action.mode) {
                case 'enter':
                  moveCurrentCell(currentCell[0] + 1, currentCell[1]);
                  break;
                case 'tab':
                  moveCurrentCellWithTabKey(false);
                  break;
                case 'shiftTab':
                  moveCurrentCellWithTabKey(true);
                  break;
              }
            }
          }, 0);
        }
        // if (action.mode == 'save') setTimeout(handleSave, 0);
        return {};
      }
      // case 'shouldSave': {
      //   return {
      //     ...state,
      //     shouldSave: true,
      //   };
      // }
    }
    return {};
  }, {});

  function focusFilterEditor(columnRealIndex) {
    let modelIndex = columnSizes.realToModel(columnRealIndex);
    const domFilter = domFilterControlsRef.get()[columns[modelIndex].uniqueName];
    if (domFilter) domFilter.focus();
    return ['filter', columnRealIndex];
  }

  registerMenu(
    { command: 'dataGrid.refresh' },
    { placeTag: 'copy' },
    {
      text: 'Copy advanced',
      submenu: [
        _.keys(copyRowsFormatDefs).map(format => ({
          text: copyRowsFormatDefs[format].label,
          onClick: () => copyToClipboardCore(format),
        })),
        { divider: true },
        _.keys(copyRowsFormatDefs).map(format => ({
          text: `Set format: ${copyRowsFormatDefs[format].name}`,
          onClick: () => ($copyRowsFormat = format),
        })),

        // { text: 'Copy as text', onClick: () => copyToClipboardCore('text') },
        // { text: 'Copy as CSV', onClick: () => copyToClipboardCore('csv') },
        // { text: 'Copy as JSON', onClick: () => copyToClipboardCore('json') },
      ],
    },
    { placeTag: 'switch' },
    { divider: true },
    { placeTag: 'save' },
    { command: 'dataGrid.revertRowChanges', hideDisabled: true },
    { command: 'dataGrid.revertAllChanges', hideDisabled: true },
    { command: 'dataGrid.deleteSelectedRows' },
    { command: 'dataGrid.insertNewRow' },
    { command: 'dataGrid.cloneRows' },
    { command: 'dataGrid.setNull', hideDisabled: true },
    { command: 'dataGrid.removeField', hideDisabled: true },
    { placeTag: 'edit' },
    { divider: true },
    { command: 'dataGrid.findColumn' },
    { command: 'dataGrid.hideColumn', hideDisabled: true },
    { command: 'dataGrid.filterSelected' },
    { command: 'dataGrid.clearFilter' },
    { command: 'dataGrid.addNewColumn', hideDisabled: true },
    { command: 'dataGrid.undo', hideDisabled: true },
    { command: 'dataGrid.redo', hideDisabled: true },
    { divider: true },
    { command: 'dataGrid.editCellValue', hideDisabled: true },
    { command: 'dataGrid.newJson', hideDisabled: true },
    { command: 'dataGrid.editJsonDocument', hideDisabled: true },
    { command: 'dataGrid.viewJsonDocument', hideDisabled: true },
    { command: 'dataGrid.viewJsonValue', hideDisabled: true },
    { command: 'dataGrid.openJsonArrayInSheet', hideDisabled: true },
    { command: 'dataGrid.saveCellToFile', hideDisabled: true },
    { command: 'dataGrid.loadCellFromFile', hideDisabled: true },
    // { command: 'dataGrid.copyJsonDocument', hideDisabled: true },
    { divider: true },
    { placeTag: 'export' },
    {
      label: 'Save to current archive',
      submenu: [
        { command: 'dataGrid.mergeSelectedCellsIntoMirror' },
        { command: 'dataGrid.mergeSelectedRowsIntoMirror' },
        { command: 'dataGrid.appendSelectedCellsIntoMirror' },
        { command: 'dataGrid.appendSelectedRowsIntoMirror' },
        { command: 'dataGrid.replaceSelectedCellsIntoMirror' },
        { command: 'dataGrid.replaceSelectedRowsIntoMirror' },
      ],
    },
    { command: 'dataGrid.generateSqlFromData' },
    { command: 'dataGrid.openFreeTable' },
    { command: 'dataGrid.openChartFromSelection' },
    { command: 'dataGrid.openSelectionInMap', hideDisabled: true },
    { placeTag: 'chart' }
  );

  const menu = getContextMenu();

  function buildMenu() {
    return [
      menu,
      {
        text: copyRowsFormatDefs[$copyRowsFormat].label,
        onClick: () => copyToClipboardCore($copyRowsFormat),
        keyText: 'CtrlOrCommand+C',
        tag: 'copy',
      },
    ];
  }

  // $: {
  //   if (!tabControlHiddenTab) {
  //     if (!multipleGridsOnTab && allRowCount != null) {
  //       updateStatuBarInfo(tabid, [{ text: `Rows: ${allRowCount.toLocaleString()}` }]);
  //     } else {
  //       updateStatuBarInfo(tabid, []);
  //     }
  //   }
  // }
</script>

{#if !display || (!isDynamicStructure && (!columns || columns.length == 0))}
  {#if $databaseStatus?.name == 'pending' || $databaseStatus?.name == 'checkStructure' || $databaseStatus?.name == 'loadStructure'}
    <LoadingInfo wrapper message="Waiting for structure" />
  {:else}
    <ErrorInfo alignTop message="No structure was loaded, probably table doesn't exist in current database" />
  {/if}
{:else if errorMessage}
  <div>
    <ErrorInfo message={errorMessage} alignTop />
    <FormStyledButton value="Reset filter" on:click={() => display.clearFilters()} />
    <FormStyledButton value="Reset view" on:click={() => display.resetConfig()} />
    {#if onOpenQueryOnError ?? onOpenQuery}
      <FormStyledButton value="Open Query" on:click={() => (onOpenQueryOnError ?? onOpenQuery)()} />
    {/if}
  </div>
{:else if isDynamicStructure && isLoadedAll && grider?.rowCount == 0}
  <div class="ml-2">
    <ErrorInfo
      alignTop
      message={grider.editable
        ? 'No rows loaded, check filter or add new documents. You could copy documents from other collections/tables with Copy advanved/Copy as JSON command.'
        : 'No rows loaded'}
    />
    {#if display.filterCount > 0}
      <FormStyledButton value="Reset filter" on:click={() => display.clearFilters()} />
    {/if}
    {#if grider.editable}
      <FormStyledButton value="Add document" on:click={addJsonDocument} />
    {/if}
    {#if onOpenQuery}
      <FormStyledButton value="Open Query" on:click={() => onOpenQuery()} />
    {/if}
  </div>
{:else if grider.errors && grider.errors.length > 0}
  <div>
    {#each grider.errors as err}
      <ErrorInfo message={err} isSmall />
    {/each}
  </div>
{:else}
  <div
    class="container"
    class:data-grid-focused={isGridFocused}
    bind:clientWidth={containerWidth}
    bind:clientHeight={containerHeight}
    bind:this={domContainer}
    use:contextMenu={buildMenu}
    use:contextMenuActivator={activator}
    on:wheel={handleGridWheel}
    on:click={e => {
      if (e.target == domContainer) {
        domFocusField?.focus();
      }
    }}
  >
    <input
      type="text"
      class="focus-field"
      bind:this={domFocusField}
      on:keydown={handleGridKeyDown}
      on:focus={() => {
        activator.activate();
        invalidateCommands();
        isGridFocused = true;
      }}
      on:blur
      on:paste={handlePaste}
      on:copy={copyToClipboard}
      on:blur={() => {
        isGridFocused = false;
      }}
    />
    <table
      class="table"
      on:mousedown={handleGridMouseDown}
      on:mousemove={handleGridMouseMove}
      on:mouseup={handleGridMouseUp}
    >
      <thead>
        <tr>
          <td
            class="header-cell"
            data-row="header"
            data-col="header"
            style={`width:${headerColWidth}px; min-width:${headerColWidth}px; max-width:${headerColWidth}px`}
          >
            {#if !hideGridLeftColumn}
              <CollapseButton
                collapsed={$collapsedLeftColumnStore}
                on:click={() => collapsedLeftColumnStore.update(x => !x)}
              />
            {/if}
          </td>
          {#each visibleRealColumns as col (col.uniqueName)}
            <td
              class="header-cell"
              data-row="header"
              data-col={col.colIndex}
              style={`width:${col.width}px; min-width:${col.width}px; max-width:${col.width}px`}
            >
              <ColumnHeaderControl
                column={col}
                {conid}
                {database}
                setSort={display.sortable ? order => display.setSort(col.uniqueName, order) : null}
                addToSort={display.sortable ? order => display.addToSort(col.uniqueName, order) : null}
                order={display.sortable ? display.getSortOrder(col.uniqueName) : null}
                orderIndex={display.sortable ? display.getSortOrderIndex(col.uniqueName) : -1}
                isSortDefined={display.sortable ? display.isSortDefined() : false}
                clearSort={display.sortable ? () => display.clearSort() : null}
                on:resizeSplitter={e => {
                  // @ts-ignore
                  display.resizeColumn(col.uniqueName, col.width, e.detail);
                }}
                setGrouping={display.groupable ? groupFunc => display.setGrouping(col.uniqueName, groupFunc) : null}
                grouping={display.getGrouping(col.uniqueName)}
                {allowDefineVirtualReferences}
              />
            </td>
          {/each}
        </tr>
        {#if display.filterable}
          <tr>
            <td
              class="header-cell"
              data-row="filter"
              data-col="header"
              style={`width:${headerColWidth}px; min-width:${headerColWidth}px; max-width:${headerColWidth}px`}
            >
              {#if display.filterCount > 0}
                <InlineButton on:click={() => display.clearFilters()} square>
                  <FontIcon icon="icon filter-off" />
                </InlineButton>
              {/if}
            </td>
            {#each visibleRealColumns as col (col.uniqueName)}
              <td
                class="filter-cell"
                data-row="filter"
                data-col={col.colIndex}
                style={`width:${col.width}px; min-width:${col.width}px; max-width:${col.width}px`}
              >
                <DataFilterControl
                  onGetReference={value => (domFilterControlsRef.get()[col.uniqueName] = value)}
                  foreignKey={col.foreignKey}
                  columnName={col.uniquePath.length == 1 ? col.uniquePath[0] : null}
                  uniqueName={col.uniqueName}
                  pureName={col.pureName}
                  schemaName={col.schemaName}
                  {conid}
                  {database}
                  {jslid}
                  {formatterFunction}
                  driver={display?.driver}
                  filterBehaviour={display?.filterBehaviourOverride ??
                    col.filterBehaviour ??
                    detectSqlFilterBehaviour(col.dataType)}
                  filter={display.getFilter(col.uniqueName)}
                  setFilter={value => display.setFilter(col.uniqueName, value)}
                  showResizeSplitter
                  on:resizeSplitter={e => {
                    // @ts-ignore
                    display.resizeColumn(col.uniqueName, col.width, e.detail);
                  }}
                  onFocusGrid={() => {
                    selectTopmostCell(col.uniqueName);
                  }}
                  dataType={col.dataType}
                />
              </td>
            {/each}
          </tr>
        {/if}
      </thead>
      <tbody>
        {#each _.range(firstVisibleRowScrollIndex, Math.min(firstVisibleRowScrollIndex + visibleRowCountUpperBound, grider.rowCount)) as rowIndex (rowIndex)}
          <DataGridRow
            {rowIndex}
            {grider}
            {conid}
            {database}
            driver={display?.driver}
            {visibleRealColumns}
            {rowHeight}
            {autofillSelectedCells}
            {isDynamicStructure}
            selectedCells={filterCellsForRow(selectedCells, rowIndex)}
            autofillMarkerCell={filterCellForRow(autofillMarkerCell, rowIndex)}
            focusedColumns={display.focusedColumns}
            inplaceEditorState={$inplaceEditorState}
            currentCellColumn={currentCell && currentCell[0] == rowIndex ? currentCell[1] : null}
            {dispatchInsplaceEditor}
            {frameSelection}
            onSetFormView={formViewAvailable && display?.baseTable?.primaryKey ? handleSetFormView : null}
            {dataEditorTypesBehaviourOverride}
            {gridColoringMode}
          />
        {/each}
      </tbody>
    </table>

    {#if !isDynamicStructure && isLoadedAll && grider?.rowCount == 0}
      <div class="no-rows-info ml-2">
        <div class="mb-3">
          <ErrorInfo alignTop message="No rows loaded" icon="img info" />
        </div>
        {#if display.filterCount > 0}
          <FormStyledButton value="Reset filter" on:click={() => display.clearFilters()} />
        {/if}
        {#if grider.editable}
          <FormStyledButton value="Add row" on:click={insertNewRow} />
        {/if}
        {#if onOpenQuery}
          <FormStyledButton value="Open Query" on:click={() => onOpenQuery()} />
        {/if}
      </div>
    {/if}

    <HorizontalScrollBar
      minimum={0}
      maximum={maxScrollColumn}
      viewportRatio={gridScrollAreaWidth / columnSizes.getVisibleScrollSizeSum()}
      on:scroll={e => (firstVisibleColumnScrollIndex = e.detail)}
      bind:this={domHorizontalScroll}
    />
    <VerticalScrollBar
      minimum={0}
      maximum={grider.rowCount - visibleRowCountUpperBound + 2}
      viewportRatio={visibleRowCountUpperBound / grider.rowCount}
      on:scroll={e => (firstVisibleRowScrollIndex = e.detail)}
      bind:this={domVerticalScroll}
    />
    {#if selectedCellsInfo}
      <div class="row-count-label">
        {selectedCellsInfo}
      </div>
    {:else if allRowCount != null && multipleGridsOnTab}
      <div class="row-count-label">
        Rows: {allRowCount.toLocaleString()}
      </div>
    {/if}

    {#if isLoading}
      <LoadingInfo wrapper message="Loading data" />
    {/if}

    {#if !tabControlHiddenTab && !multipleGridsOnTab && allRowCount != null}
      <StatusBarTabItem text={`Rows: ${allRowCount.toLocaleString()}`} />
    {/if}
  </div>
{/if}

<style>
  .container {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    user-select: none;
    overflow: hidden;
  }
  .table {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 20px;
    overflow: scroll;
    border-collapse: collapse;
    outline: none;
  }
  .header-cell {
    border: 1px solid var(--theme-border);
    text-align: left;
    padding: 0;
    margin: 0;
    background-color: var(--theme-bg-1);
    overflow: hidden;
  }
  .filter-cell {
    text-align: left;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }
  .focus-field {
    position: absolute;
    left: -1000px;
    top: -1000px;
  }
  .row-count-label {
    position: absolute;
    background-color: var(--theme-bg-2);
    right: 40px;
    bottom: 20px;
  }

  .no-rows-info {
    margin-top: 60px;
  }
</style>
