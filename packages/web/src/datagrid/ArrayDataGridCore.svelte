<script lang="ts">
  import { createGridCache, createGridConfig, FreeTableGridDisplay } from 'dbgate-datalib';
  import { evaluateCondition } from 'dbgate-sqltree';
  import { writable } from 'svelte/store';
  import uuidv1 from 'uuid/v1';

  import DataGridCore from './DataGridCore.svelte';
  import RowsArrayGrider from './RowsArrayGrider';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { registerMenu } from '../utility/contextMenu';
  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import { exportQuickExportFile } from '../utility/exportFileTools';
  import { openImportExportTab } from '../utility/importExportTools';
  import { apiCall } from '../utility/api';

  export let rows;
  export let errorMessage = null;
  export let isLoading = false;
  export let externalDisplay = null;
  export let formatterFunction = undefined;
  export let isLoadedAll = true;
  export let loadedTime = undefined;
  export let changeSetStore = undefined;
  export let collapsedLeftColumnStore = undefined;
  export let jslid = undefined;

  let model = null;
  let filteredRows = [];
  let rowsForValueLookup = [];

  const config = writable(createGridConfig());
  const cache = writable(createGridCache());

  $: model = {
    structure: { __isDynamicStructure: true },
    rows,
  };
  $: display =
    externalDisplay ||
    new FreeTableGridDisplay(model, $config, config.update, $cache, cache.update, { filterable: true });
  $: {
    const sourceRows = rows || [];
    const condition = display?.compileJslFilters?.();

    if (!condition) {
      filteredRows = sourceRows;
    } else {
      filteredRows = sourceRows.filter(row => {
        try {
          return !!evaluateCondition(condition, row);
        } catch {
          return true;
        }
      });
    }
  }
  $: grider = new RowsArrayGrider(filteredRows);
  $: rowsForValueLookup = getRowsForExport(rows);

  function getRowsForExport(rows) {
    const sourceRows = rows || [];
    if (sourceRows.length === 0) return sourceRows;

    const firstRow = sourceRows[0];
    if (firstRow && typeof firstRow === 'object' && firstRow.__isStreamHeader === true) {
      return sourceRows.slice(1);
    }

    return sourceRows;
  }

  async function saveRowsToTempJsl() {
    const tempJslId = uuidv1();
    await apiCall('jsldata/save-rows', {
      jslid: tempJslId,
      rows: getRowsForExport(rows),
    });
    return tempJslId;
  }

  async function exportGrid() {
    const tempJslId = await saveRowsToTempJsl();
    const initialValues: any = {};
    initialValues.sourceStorageType = 'jsldata';
    initialValues.sourceJslId = tempJslId;
    initialValues.sourceList = ['query-data'];
    initialValues['columns_query-data'] = display.getExportColumnMap();
    openImportExportTab(initialValues);
  }

  const quickExportHandler = fmt => async () => {
    const tempJslId = await saveRowsToTempJsl();
    await exportQuickExportFile(
      'Query',
      {
        functionName: 'jslDataReader',
        props: {
          jslid: tempJslId,
        },
      },
      fmt,
      display.getExportColumnMap()
    );
  };

  registerMenu(() =>
    createQuickExportMenu(
      quickExportHandler,
      {
        text: 'Export advanced...',
        onClick: () => exportGrid(),
      },
      { tag: 'export' }
    )
  );
</script>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{:else if errorMessage}
  <ErrorInfo message={errorMessage} />
{:else if grider}
  <DataGridCore
    {...$$props}
    {grider}
    {display}
    {formatterFunction}
    {isLoadedAll}
    {loadedTime}
    {changeSetStore}
    {collapsedLeftColumnStore}
    {jslid}
    passAllRows={rowsForValueLookup}
  />
{/if}
