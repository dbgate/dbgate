<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import createRef from '../utility/createRef';

  export let hidden = false;

  let definitions = [];
  const dynamicPropsCollection = [];
  let clientHeight;

  const widgetColumnBarHeight = writable(0);

  setContext('widgetColumnBarHeight', widgetColumnBarHeight);
  setContext('pushWidgetItemDefinition', (item, dynamicProps) => {
    dynamicPropsCollection.push(dynamicProps);
    definitions = [...definitions, item];
    return definitions.length - 1;
  });
  setContext('updateWidgetItemDefinition', (index, item) => {
    definitions[index] = item;
  });

  $: $widgetColumnBarHeight = clientHeight;

  $: computeDynamicProps(definitions);

  function computeDynamicProps(defs: any[]) {
    const visibleItemsCount = defs.filter(x => !x.collapsed && !x.skip).length;
    for (let index = 0; index < defs.length; index++) {
      const definition = defs[index];
      const splitterVisible = !!defs.slice(index + 1).find(x => x && !x.collapsed && !x.skip);
      dynamicPropsCollection[index].set({ splitterVisible, visibleItemsCount });
    }
  }
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
