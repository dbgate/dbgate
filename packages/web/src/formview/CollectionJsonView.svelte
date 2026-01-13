<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('CollectionJsonView');

  registerCommand({
    id: 'collectionJsonView.expandAll',
    category: __t('command.collectionData', { defaultMessage: 'Collection data' }),
    name: __t('command.collectionData.expandAll', { defaultMessage: 'Expand all' }),
    isRelatedToTab: true,
    icon: 'icon expand-all',
    onClick: () => getCurrentEditor().handleExpandAll(),
    testEnabled: () => getCurrentEditor() != null && !getCurrentEditor()?.isExpandedAll(),
  });
  registerCommand({
    id: 'collectionJsonView.collapseAll',
    category: __t('command.collectionData', { defaultMessage: 'Collection data' }),
    name: __t('command.collectionData.collapseAll', { defaultMessage: 'Collapse all' }),
    isRelatedToTab: true,
    icon: 'icon collapse-all',
    onClick: () => getCurrentEditor().handleCollapseAll(),
    testEnabled: () => getCurrentEditor() != null && getCurrentEditor()?.isExpandedAll(),
  });
</script>

<script lang="ts">
  import _ from 'lodash';

  import { onMount } from 'svelte';
  import registerCommand from '../commands/registerCommand';
  import ChangeSetGrider from '../datagrid/ChangeSetGrider';
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  import { loadCollectionDataPage } from '../datagrid/CollectionDataGridCore.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import Pager from '../elements/Pager.svelte';

  import contextMenu, { getContextMenu, registerMenu } from '../utility/contextMenu';
  import CollectionJsonRow from './CollectionJsonRow.svelte';
  import { getIntSettingsValue } from '../settings/settingsTools';
  import invalidateCommands from '../commands/invalidateCommands';
  import { __t } from '../translations';

  export let conid;
  export let database;
  export let cache;
  export let display;
  export let setConfig;

  export let changeSetState;
  export let dispatchChangeSet;
  export let setLoadedRows;

  export const activator = createActivator('CollectionJsonView', true);

  let isLoading = false;
  let loadedTime = null;
  let expandAll = false;
  let expandKey = 0;

  let loadedRows = [];
  let skip = 0;
  let limit = getIntSettingsValue('dataGrid.collectionPageSize', 50, 5, 1000);

  async function loadData() {
    isLoading = true;
    // @ts-ignore
    loadedRows = await loadCollectionDataPage($$props, parseInt(skip) || 0, parseInt(limit) || 50);
    if (setLoadedRows) setLoadedRows(loadedRows);
    isLoading = false;
    loadedTime = new Date().getTime();
  }

  $: if (cache?.refreshTime > loadedTime) {
    loadData();
  }

  onMount(() => {
    loadData();
  });

  registerMenu({ placeTag: 'switch' });

  const menu = getContextMenu();

  $: grider = new ChangeSetGrider(loadedRows, changeSetState, dispatchChangeSet, display);

  // $: console.log('GRIDER', grider);

  export function handleExpandAll() {
    expandAll = true;
    expandKey += 1;
    invalidateCommands();
  }

  export function handleCollapseAll() {
    expandAll = false;
    expandKey += 1;
    invalidateCommands();
  }

  export function isExpandedAll() {
    return expandAll;
  }
</script>

<div class="wrapper" use:contextMenu={menu}>
  <div class="toolbar">
    <Pager bind:skip bind:limit on:load={() => display.reload()} />
  </div>
  <div class="json">
    {#key expandKey}
      {#each _.range(0, grider.rowCount) as rowIndex}
        <CollectionJsonRow {grider} {rowIndex} {expandAll} />
      {/each}
    {/key}
  </div>
</div>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{/if}

<style>
  .toolbar {
    background: var(--theme-toolstrip-background);
    display: flex;
    border-bottom: var(--theme-toolstrip-border);
    border-top: var(--theme-toolstrip-border);
    margin-bottom: 3px;
    
  }

  .toolbar :global(input){
    margin-top: 3px;
    margin-bottom: 3px;
    height: 26px;
  }

  .json {
    overflow: auto;
    flex: 1;
    /* position: relative; */
  }

  .wrapper {
    display: flex;
    flex-direction: column;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
</style>
