<script lang="ts">
  import { createGridCache, createGridConfig, FreeTableGridDisplay } from 'dbgate-datalib';
  import { writable } from 'svelte/store';

  import ArrayDataGridCore from './ArrayDataGridCore.svelte';
  import ColumnManager from './ColumnManager.svelte';
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';

  export let rows = [];
  export let errorMessage = null;
  export let isLoading = false;
  export let conid = null;
  export let database = null;
  export let hideGridLeftColumn = false;

  let managerSize = 220;
  let model: any = null;
  let display: any = null;
  const collapsedLeftColumnStore = writable(false);

  const config = writable(createGridConfig());
  const cache = writable(createGridCache());

  $: model = {
    structure: { __isDynamicStructure: true },
    rows,
  };

  $: display = new FreeTableGridDisplay(model, $config, config.update, $cache, cache.update, { filterable: true });
</script>

<div class="array-grid-wrapper">
  <HorizontalSplitter
    initialValue="220px"
    bind:size={managerSize}
    hideFirst={hideGridLeftColumn || $collapsedLeftColumnStore}
  >
    <svelte:fragment slot="1">
      <div class="column-selector">
        <ColumnManager {display} {managerSize} {conid} {database} isDynamicStructure />
      </div>
    </svelte:fragment>
    <svelte:fragment slot="2">
      <div class="grid-content">
        <ArrayDataGridCore
          {rows}
          {errorMessage}
          {isLoading}
          {hideGridLeftColumn}
          {collapsedLeftColumnStore}
          externalDisplay={display}
        />
      </div>
    </svelte:fragment>
  </HorizontalSplitter>
</div>

<style>
  .array-grid-wrapper {
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .column-selector {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .column-selector :global(.managerInnerContainer),
  .column-selector :global(.manager-inner-container) {
    max-width: none !important;
    width: 100%;
  }

  .grid-content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
</style>
