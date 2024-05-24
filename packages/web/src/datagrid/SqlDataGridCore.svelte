<script context="module" lang="ts">
  const getCurrentEditor = () => getActiveComponent('SqlDataGridCore');

  registerCommand({
    id: 'sqlDataGrid.openActiveChart',
    category: 'Data grid',
    name: 'Open active chart',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().openActiveChart(),
  });

  registerCommand({
    id: 'sqlDataGrid.openQuery',
    category: 'Data grid',
    name: 'Open query',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().openQuery(),
  });

  registerCommand({
    id: 'sqlDataGrid.export',
    category: 'Data grid',
    name: 'Export',
    icon: 'icon export',
    keyText: 'CtrlOrCommand+E',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().exportGrid(),
  });

  async function loadDataPage(props, offset, limit) {
    const { display, conid, database } = props;

    const select = display.getPageQuery(offset, limit);

    const response = await apiCall('database-connections/sql-select', {
      conid,
      database,
      select,
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

<script lang="ts">
  import _ from 'lodash';
  import { getContext } from 'svelte';
  import { registerQuickExportHandler } from '../buttons/ToolStripExportButton.svelte';

  import registerCommand from '../commands/registerCommand';
  import { extractShellConnection } from '../impexp/createImpExpScript';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { apiCall } from '../utility/api';

  import { registerMenu } from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import { exportQuickExportFile } from '../utility/exportFileTools';
  import { getConnectionInfo } from '../utility/metadataLoaders';
  import openNewTab from '../utility/openNewTab';
  import ChangeSetGrider from './ChangeSetGrider';

  import LoadingDataGridCore from './LoadingDataGridCore.svelte';

  export let conid;
  export let display;
  export let database;
  export let schemaName;
  export let pureName;
  export let config;
  export let changeSetState;
  export let dispatchChangeSet;

  export let macroPreview;
  export let macroValues;
  export let selectedCellsPublished = () => [];

  // export let onChangeGrider = undefined;

  export const activator = createActivator('SqlDataGridCore', false);

  let loadedRows = [];

  let grider;

  // $: console.log('loadedRows BIND', loadedRows);

  $: {
    if (macroPreview) {
      grider = new ChangeSetGrider(
        loadedRows,
        changeSetState,
        dispatchChangeSet,
        display,
        macroPreview,
        macroValues,
        selectedCellsPublished()
      );
    }
  }
  // prevent recreate grider, if no macro is selected, so there is no need to selectedcells in macro
  $: {
    if (!macroPreview) {
      grider = new ChangeSetGrider(loadedRows, changeSetState, dispatchChangeSet, display);
    }
  }
  // $: console.log('GRIDER', grider);
  // $: if (onChangeGrider) onChangeGrider(grider);

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
    showModal(ImportExportModal, { initialValues });
  }

  export function openQuery() {
    openNewTab(
      {
        title: 'Query #',
        icon: 'img sql-file',
        tabComponent: 'QueryTab',
        props: {
          schemaName: display.baseTableOrSimilar?.schemaName,
          pureName: display.baseTableOrSimilar?.pureName,
          conid,
          database,
        },
      },
      {
        editor: display.getExportQuery(),
      }
    );
  }

  export function openActiveChart() {
    openNewTab(
      {
        title: 'Chart #',
        icon: 'img chart',
        tabComponent: 'ChartTab',
        props: {
          conid,
          database,
        },
      },
      {
        editor: {
          config: { chartType: 'bar' },
          sql: display.getExportQuery(select => {
            select.orderBy = null;
          }),
        },
      }
    );
  }

  const quickExportHandler = fmt => async () => {
    const coninfo = await getConnectionInfo({ conid });
    exportQuickExportFile(
      pureName || 'Data',
      {
        functionName: 'queryReader',
        props: {
          connection: extractShellConnection(coninfo, database),
          queryType: coninfo.isReadOnly ? 'json' : 'native',
          query: coninfo.isReadOnly ? display.getExportQueryJson() : display.getExportQuery(),
        },
      },
      fmt,
      display.getExportColumnMap()
    );
  };
  registerQuickExportHandler(quickExportHandler);

  registerMenu(
    { command: 'sqlDataGrid.openActiveChart', tag: 'chart' },
    { command: 'sqlDataGrid.openQuery', tag: 'export' },
    () => ({
      ...createQuickExportMenu(quickExportHandler, { command: 'sqlDataGrid.export' }),
      tag: 'export',
    })
  );

  function handleSetLoadedRows(rows) {
    loadedRows = rows;
  }
</script>

<LoadingDataGridCore
  {...$$props}
  {loadDataPage}
  {dataPageAvailable}
  {loadRowCount}
  setLoadedRows={handleSetLoadedRows}
  bind:selectedCellsPublished
  frameSelection={!!macroPreview}
  {grider}
  {display}
  onOpenQuery={openQuery}
/>
