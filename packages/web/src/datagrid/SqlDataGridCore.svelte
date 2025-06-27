<script context="module" lang="ts">
  const getCurrentEditor = () => getActiveComponent('SqlDataGridCore');

  registerCommand({
    id: 'sqlDataGrid.openQuery',
    category: 'Data grid',
    name: 'Open query',
    testEnabled: () => getCurrentEditor() != null && hasPermission('dbops/query'),
    onClick: () => getCurrentEditor().openQuery(),
  });

  registerCommand({
    id: 'sqlDataGrid.export',
    category: 'Data grid',
    name: 'Export',
    icon: 'icon export',
    keyText: 'CtrlOrCommand+E',
    testEnabled: () => getCurrentEditor() != null && hasPermission('dbops/export'),
    onClick: () => getCurrentEditor().exportGrid(),
  });
</script>

<script lang="ts">
  import _ from 'lodash';
  import { registerQuickExportHandler } from '../buttons/ToolStripExportButton.svelte';

  import registerCommand from '../commands/registerCommand';
  import {
    extractShellConnection,
    extractShellConnectionHostable,
    extractShellHostConnection,
  } from '../impexp/createImpExpScript';
  import { apiCall } from '../utility/api';

  import { registerMenu } from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import { exportQuickExportFile } from '../utility/exportFileTools';
  import { getConnectionInfo } from '../utility/metadataLoaders';
  import openNewTab from '../utility/openNewTab';
  import ChangeSetGrider from './ChangeSetGrider';

  import LoadingDataGridCore from './LoadingDataGridCore.svelte';
  import hasPermission from '../utility/hasPermission';
  import { openImportExportTab } from '../utility/importExportTools';
  import { getIntSettingsValue } from '../settings/settingsTools';
  import OverlayDiffGrider from './OverlayDiffGrider';

  export let conid;
  export let display;
  export let database;
  export let schemaName;
  export let pureName;
  export let config;
  export let changeSetState;
  export let dispatchChangeSet;
  export let overlayDefinition = null;

  export let macroPreview;
  export let macroValues;
  export let onPublishedCellsChanged;

  let publishedCells = [];

  // export let onChangeGrider = undefined;

  export const activator = createActivator('SqlDataGridCore', false);

  let loadedRows = [];

  let grider;

  // $: console.log('loadedRows BIND', loadedRows);

  $: {
    if (!overlayDefinition && macroPreview) {
      grider = new ChangeSetGrider(
        loadedRows,
        changeSetState,
        dispatchChangeSet,
        display,
        macroPreview,
        macroValues,
        publishedCells
      );
    }
  }
  // prevent recreate grider, if no macro is selected, so there is no need to selectedcells in macro
  $: {
    if (!overlayDefinition && !macroPreview) {
      grider = new ChangeSetGrider(loadedRows, changeSetState, dispatchChangeSet, display);
    }
  }
  // $: console.log('GRIDER', grider);
  // $: if (onChangeGrider) onChangeGrider(grider);

  $: {
    if (overlayDefinition) {
      grider = new OverlayDiffGrider(
        loadedRows,
        display,
        overlayDefinition.matchColumns,
        overlayDefinition.overlayData,
        overlayDefinition.matchedDbKeys
      );
    }
  }

  export async function exportGrid() {
    const coninfo = await getConnectionInfo({ conid });

    const initialValues: any = {};
    initialValues.sourceStorageType = 'query';
    initialValues.sourceConnectionId = conid;
    initialValues.sourceDatabaseName = database;
    initialValues.sourceQuery = coninfo.isReadOnly
      ? JSON.stringify(display.getExportQueryJson(), undefined, 2)
      : display.getExportQuery();
    initialValues.sourceQueryType = coninfo.isReadOnly ? 'json' : 'native';
    initialValues.sourceList = display.baseTableOrSimilar ? [display.baseTableOrSimilar.pureName] : [];
    initialValues[`columns_${pureName}`] = display.getExportColumnMap();
    openImportExportTab(initialValues);
    // showModal(ImportExportModal, { initialValues });
  }

  export function openQuery(sql?) {
    openNewTab(
      {
        title: 'Query #',
        icon: 'img sql-file',
        tabComponent: 'QueryTab',
        focused: true,
        props: {
          schemaName: display.baseTableOrSimilar?.schemaName,
          pureName: display.baseTableOrSimilar?.pureName,
          conid,
          database,
        },
      },
      {
        editor: sql ?? display.getExportQuery(),
      }
    );
  }

  function openQueryOnError() {
    openQuery(display.getPageQueryText(0, getIntSettingsValue('dataGrid.pageSize', 100, 5, 1000)));
  }

  const quickExportHandler = fmt => async () => {
    const coninfo = await getConnectionInfo({ conid });
    exportQuickExportFile(
      pureName || 'Data',
      {
        functionName: 'queryReader',
        props: {
          ...extractShellConnectionHostable(coninfo, database),
          queryType: coninfo.isReadOnly ? 'json' : 'native',
          query: coninfo.isReadOnly ? display.getExportQueryJson() : display.getExportQuery(),
        },
        hostConnection: extractShellHostConnection(coninfo, database),
      },
      fmt,
      display.getExportColumnMap()
    );
  };
  registerQuickExportHandler(quickExportHandler);

  registerMenu(
    { command: 'sqlDataGrid.openActiveChart', tag: 'chart' },
    { command: 'sqlDataGrid.openQuery', tag: 'export' },
    () =>
      createQuickExportMenu(
        quickExportHandler,
        {
          command: 'sqlDataGrid.export',
        },
        { tag: 'export' }
      )
  );

  function handleSetLoadedRows(rows) {
    loadedRows = rows;
  }

  async function loadDataPage(props, offset, limit) {
    const { display, conid, database } = props;

    const select = display.getPageQuery(offset, limit);

    const response = await apiCall('database-connections/sql-select', {
      conid,
      database,
      select,
      auditLogSessionGroup: 'data-grid',
    });

    if (response.errorMessage) return response;
    return response.rows;
  }

  function dataPageAvailable(props) {
    const { display } = props;
    const select = display.getPageQuery(0, 1);
    return !!select;
  }

  async function loadRowCount(props) {
    const { display, conid, database } = props;

    const select = display.getCountQuery();

    const response = await apiCall('database-connections/sql-select', {
      conid,
      database,
      select,
    });

    return parseInt(response.rows[0].count);
  }
</script>

<LoadingDataGridCore
  {...$$props}
  {loadDataPage}
  {dataPageAvailable}
  {loadRowCount}
  setLoadedRows={handleSetLoadedRows}
  onPublishedCellsChanged={value => {
    publishedCells = value;
    if (onPublishedCellsChanged) {
      onPublishedCellsChanged(value);
    }
  }}
  frameSelection={!!macroPreview}
  {grider}
  {display}
  onOpenQuery={openQuery}
  onOpenQueryOnError={openQueryOnError}
/>
