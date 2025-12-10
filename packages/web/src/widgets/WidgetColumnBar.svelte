<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import _ from 'lodash';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';

  export let hidden = false;
  export let storageName = null;

  let definitions = {};
  let clientHeight;
  let definitionCount = 0;

  // const widgetColumnBarHeight = writable(0);
  const widgetColumnBarComputed = writable({});
  const fromStorage = getLocalStorage(storageName);
  let deltaHeights = fromStorage?.deltaHeights || {};

  $: setLocalStorage(storageName, { deltaHeights });

  // setContext('widgetColumnBarHeight', widgetColumnBarHeight);
  setContext('pushWidgetItemDefinition', (name, item) => {
    definitions = {
      ...definitions,
      [name]: {
        ...item,
        name,
        index: definitionCount,
      },
    };
    definitionCount += 1;
  });
  setContext('updateWidgetItemDefinition', (name, item) => {
    // console.log('WidgetColumnBar updateWidgetItemDefinition', name, item);
    definitions = {
      ...definitions,
      [name]: { ...definitions[name], ...item },
    };
  });
  setContext('widgetResizeItem', (name, deltaHeight) => {
    deltaHeights = {
      ...deltaHeights,
      [name]: (deltaHeights[name] || 0) + deltaHeight,
    };
    recompute(definitions);
  });
  setContext('widgetColumnBarComputed', widgetColumnBarComputed);

  // $: $widgetColumnBarHeight = clientHeight;

  $: recompute(definitions);

  function recompute(defs: any) {
    const visibleItems = _.orderBy(_.values(defs), ['index'])
      .filter(x => !x.collapsed && !x.skip && x.positiveCondition)
      .map(x => x.name);
    const visibleItemsCount = visibleItems.length;

    const computed = {};

    let totalFixedHeight = 0;
    let totalFlexibleItems = 0;
    for (const key of visibleItems) {
      const def = defs[key];
      if (def.height != null) {
        let height = 0;
        if (_.isString(def.height) && def.height.endsWith('px')) height = parseInt(def.height.slice(0, -2));
        else if (_.isString(def.height) && def.height.endsWith('%'))
          height = (clientHeight * parseFloat(def.height.slice(0, -1))) / 100;
        else height = parseInt(def.height);
        totalFixedHeight += height;
      } else {
        totalFlexibleItems++;
      }
    }

    const remainingHeight = clientHeight - totalFixedHeight;
    let visibleIndex = 0;
    for (const key of visibleItems) {
      const def = defs[key];
      let size = 0;
      if (def.height != null) {
        if (_.isString(def.height) && def.height.endsWith('px')) size = parseInt(def.height.slice(0, -2));
        else if (_.isString(def.height) && def.height.endsWith('%'))
          size = (clientHeight * parseFloat(def.height.slice(0, -1))) / 100;
        else size = parseInt(def.height);
      } else {
        size = remainingHeight / totalFlexibleItems;
      }
      size += deltaHeights[key] || 0;
      computed[key] = {
        size,
        splitterVisible: visibleItemsCount > 1 && visibleIndex < visibleItemsCount - 1,
        visibleItemsCount,
      };
      visibleIndex++;
    }

    // console.log('WidgetColumnBar definitions', defs);
    // console.log('WidgetColumnBar recompute', computed);
    $widgetColumnBarComputed = computed;
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
