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

    // First pass: calculate base heights and collect info
    let totalFixedHeight = 0;
    let totalFlexibleItems = 0;
    const itemBaseHeights = {};
    const itemMinHeights = {};
    
    for (const key of visibleItems) {
      const def = defs[key];
      const minHeight = def.minimalHeight || 0;
      itemMinHeights[key] = minHeight;
      
      if (def.height != null) {
        let height = 0;
        if (_.isString(def.height) && def.height.endsWith('px')) height = parseInt(def.height.slice(0, -2));
        else if (_.isString(def.height) && def.height.endsWith('%'))
          height = (clientHeight * parseFloat(def.height.slice(0, -1))) / 100;
        else height = parseInt(def.height);
        
        height = Math.max(height, minHeight);
        itemBaseHeights[key] = height;
        totalFixedHeight += height;
      } else {
        totalFlexibleItems++;
        itemBaseHeights[key] = minHeight; // Start with minimum
      }
    }

    // Calculate total minimum height needed
    let totalMinHeight = 0;
    for (const key of visibleItems) {
      totalMinHeight += itemMinHeights[key];
    }

    // Second pass: distribute space
    const itemHeights = {};
    
    if (totalMinHeight > clientHeight) {
      // Scale proportionally - all items get their minimum height scaled down
      const scale = clientHeight / totalMinHeight;
      for (const key of visibleItems) {
        itemHeights[key] = itemMinHeights[key] * scale;
      }
      // Clear deltaHeights as they cannot be applied
      deltaHeights = {};
    } else if (totalFixedHeight > clientHeight) {
      // Total fixed heights exceed available space - scale proportionally
      const scale = clientHeight / totalFixedHeight;
      for (const key of visibleItems) {
        const scaledHeight = itemBaseHeights[key] * scale;
        itemHeights[key] = Math.max(scaledHeight, itemMinHeights[key] * scale);
      }
      // Clear deltaHeights as they cannot be applied reliably
      deltaHeights = {};
    } else {
      // Distribute remaining space among flexible items
      const remainingHeight = clientHeight - totalFixedHeight;
      const flexibleSpace = totalFlexibleItems > 0 ? remainingHeight / totalFlexibleItems : 0;
      
      for (const key of visibleItems) {
        if (itemBaseHeights[key] === itemMinHeights[key] && totalFlexibleItems > 0) {
          // Flexible item
          itemHeights[key] = Math.max(flexibleSpace, itemMinHeights[key]);
        } else {
          // Fixed item
          itemHeights[key] = itemBaseHeights[key];
        }
      }
      
      // Apply deltaHeights while respecting minimum heights
      const newDeltaHeights = {};
      for (const key of visibleItems) {
        const delta = deltaHeights[key] || 0;
        const proposedHeight = itemHeights[key] + delta;
        
        if (proposedHeight >= itemMinHeights[key]) {
          itemHeights[key] = proposedHeight;
          newDeltaHeights[key] = delta;
        } else {
          // Delta would violate minimum height, clamp to minimum
          itemHeights[key] = itemMinHeights[key];
          // Don't preserve this delta
        }
      }
      deltaHeights = newDeltaHeights;
    }

    // Build computed result
    let visibleIndex = 0;
    for (const key of visibleItems) {
      computed[key] = {
        size: itemHeights[key],
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
