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
    keyText: 'Ctrl+E',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().exportGrid(),
  });

  async function loadDataPage(props, offset, limit) {
    const { display, conid, database } = props;

    const sql = display.getPageQuery(offset, limit);

    const response = await apiCall('database-connections/query-data', {
      conid,
      database,
      sql,
    });

    if (response.errorMessage) return response;
    return response.rows;
  }

  function dataPageAvailable(props) {
    const { display } = props;
    const sql = display.getPageQuery(0, 1);
    return !!sql;
  }

  async function loadRowCount(props) {
    const { display, conid, database } = props;

    const sql = display.getCountQuery();

    const response = await apiCall('database-connections/query-data', {
      conid,
      database,
      sql,
    });

    return parseInt(response.rows[0].count);
  }
</script>

<script lang="ts">
  import _ from 'lodash';

  import registerCommand from '../commands/registerCommand';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { extensions } from '../stores';
  import { apiCall } from '../utility/api';

  import { registerMenu } from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import { exportElectronFile } from '../utility/exportElectronFile';
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

  export function exportGrid() {
    const initialValues: any = {};
    initialValues.sourceStorageType = 'query';
    initialValues.sourceConnectionId = conid;
    initialValues.sourceDatabaseName = database;
    initialValues.sourceSql = display.getExportQuery();
    initialValues.sourceList = display.baseTableOrSimilar ? [display.baseTableOrSimilar.pureName] : [];
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

  registerMenu(
    { command: 'sqlDataGrid.openActiveChart', tag: 'chart' },
    { command: 'sqlDataGrid.openQuery', tag: 'export' },
    {
      ...createQuickExportMenu($extensions, fmt => async () => {
        const coninfo = await getConnectionInfo({ conid });
        exportElectronFile(
          pureName || 'Data',
          {
            functionName: 'queryReader',
            props: {
              connection: {
                ..._.omit(coninfo, ['_id', 'displayName']),
                database,
              },
              sql: display.getExportQuery(),
            },
          },
          fmt
        );
      }),
      tag: 'export',
    },
    { command: 'sqlDataGrid.export', tag: 'export' }
  );
</script>

<LoadingDataGridCore
  {...$$props}
  {loadDataPage}
  {dataPageAvailable}
  {loadRowCount}
  bind:loadedRows
  bind:selectedCellsPublished
  frameSelection={!!macroPreview}
  {grider}
  {display}
/>
