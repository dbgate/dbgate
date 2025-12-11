<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import _ from 'lodash';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import {
    computeInitialWidgetBarProps,
    handleResizeWidgetBar,
    toggleCollapseWidgetBar,
    WidgetBarItemDefinition,
  } from '../utility/widgetBarResizing';

  export let hidden = false;
  export let storageName = null;

  let definitions: WidgetBarItemDefinition[] = [];
  let clientHeight;

  // const widgetColumnBarHeight = writable(0);
  const widgetColumnBarComputed = writable({});
  let storedProps = getLocalStorage(storageName) || {};

  $: setLocalStorage(storageName, storedProps);

  $: containerProps = {
    clientHeight,
    titleHeight: 30,
    splitterHeight: 3,
  };

  // setContext('widgetColumnBarHeight', widgetColumnBarHeight);
  setContext('pushWidgetItemDefinition', item => {
    definitions = [...definitions, item];
  });
  setContext('updateWidgetItemDefinition', (name, item) => {
    // console.log('WidgetColumnBar updateWidgetItemDefinition', name, item);
    definitions = definitions.map(def => (def.name === name ? { ...def, ...item } : def));
  });
  setContext('widgetColumnBarComputed', widgetColumnBarComputed);
  setContext('widgetResizeItem', (name, deltaY) => {
    $widgetColumnBarComputed = handleResizeWidgetBar(
      containerProps,
      definitions,
      $widgetColumnBarComputed,
      name,
      deltaY
    );
  });
  setContext('toggleWidgetCollapse', name => {
    $widgetColumnBarComputed = toggleCollapseWidgetBar(containerProps, definitions, $widgetColumnBarComputed, name);
  });

  // $: $widgetColumnBarHeight = clientHeight;

  $: recompute(definitions);

  function recompute(defs: WidgetBarItemDefinition[]) {
    $widgetColumnBarComputed = computeInitialWidgetBarProps(containerProps, defs, storedProps);
  }

  onMount(() => {
    recompute(definitions);
  });
</script>

<div class="main-container" bind:clientHeight class:hidden>
  <slot />
</div>

<style>
  .hidden {
    display: none;
  }

  .main-container {
    position: relative;
    flex: 1;
    flex-direction: column;
    user-select: none;
  }

  .main-container:not(.hidden) {
    display: flex;
  }
</style>
