<script lang="ts" context="module">
  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
  export const allowAddToFavorites = props => true;
  export const allowSwitchDatabase = props => true;
</script>

<script lang="ts">
  import { createGridCache, ViewGridDisplay } from 'dbgate-datalib';
  import { findEngineDriver } from 'dbgate-tools';
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';

  import DataGrid from '../datagrid/DataGrid.svelte';
  import SqlDataGridCore from '../datagrid/SqlDataGridCore.svelte';
  import SqlFormView from '../formview/SqlFormView.svelte';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import { extensions } from '../stores';
  import {
    useConnectionInfo,
    useDatabaseInfo,
    useDatabaseServerVersion,
    useViewInfo,
  } from '../utility/metadataLoaders';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import useGridConfig from '../utility/useGridConfig';
  import StatusBarTabItem from '../widgets/StatusBarTabItem.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import openNewTab from '../utility/openNewTab';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
  export let objectTypeField;

  $: connection = useConnectionInfo({ conid });
  $: viewInfo = useViewInfo({ conid, database, schemaName, pureName });
  $: serverVersion = useDatabaseServerVersion({ conid, database });
  $: dbinfo = useDatabaseInfo({ conid, database });

  const config = useGridConfig(tabid);
  const cache = writable(createGridCache());

  $: display =
    $viewInfo && $connection && $serverVersion
      ? new ViewGridDisplay(
          $viewInfo,
          findEngineDriver($connection, $extensions),
          //@ts-ignore
          $config,
          config.update,
          $cache,
          cache.update,
          $dbinfo,
          $serverVersion
        )
      : null;

  const collapsedLeftColumnStore = writable(getLocalStorage('dataGrid_collapsedLeftColumn', false));
  setContext('collapsedLeftColumnStore', collapsedLeftColumnStore);
  $: setLocalStorage('dataGrid_collapsedLeftColumn', $collapsedLeftColumnStore);

  const quickExportHandlerRef = createQuickExportHandlerRef();
</script>

{#if display}
  <ToolStripContainer>
    <DataGrid
      {...$$props}
      {display}
      config={$config}
      setConfig={config.update}
      cache={$cache}
      setCache={cache.update}
      focusOnVisible
      hasMultiColumnFilter
      gridCoreComponent={SqlDataGridCore}
      formViewComponent={SqlFormView}
    />
    <svelte:fragment slot="toolstrip">
      <ToolStripButton
        icon="icon structure"
        iconAfter="icon arrow-link"
        on:click={() => {
          openNewTab({
            title: pureName,
            icon: 'img table-structure',
            tabComponent: 'TableStructureTab',
            tabPreviewMode: true,
            props: {
              schemaName,
              pureName,
              conid,
              database,
              objectTypeField,
              defaultActionId: 'openStructure',
            },
          });
        }}>Structure</ToolStripButton
      >

      <ToolStripButton
        icon="img sql-file"
        iconAfter="icon arrow-link"
        on:click={() => {
          openNewTab({
            title: pureName,
            icon: 'img sql-file',
            tabComponent: 'SqlObjectTab',
            tabPreviewMode: true,
            props: {
              schemaName,
              pureName,
              conid,
              database,
              objectTypeField,
              defaultActionId: 'showSql',
            },
          });
        }}>SQL</ToolStripButton
      >

      <ToolStripCommandButton command="dataGrid.refresh" />
      <ToolStripExportButton {quickExportHandlerRef} />
    </svelte:fragment>
  </ToolStripContainer>
{/if}

<StatusBarTabItem
  text="View columns"
  icon={$collapsedLeftColumnStore ? 'icon columns-outline' : 'icon columns'}
  clickable
  onClick={() => collapsedLeftColumnStore.update(x => !x)}
/>
