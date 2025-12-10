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
  let resizedHeights = fromStorage?.resizedHeights || {};

  $: setLocalStorage(storageName, { resizedHeights });

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
  setContext('widgetResizeItem', (name, newHeight) => {
    resizedHeights = {
      ...resizedHeights,
      [name]: newHeight,
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

    // First pass: calculate base heights
    let totalFixedHeight = 0;
    let totalFlexibleItems = 0;
    const itemHeights = {};
    const isResized = {};

    for (const key of visibleItems) {
      const def = defs[key];
      const minHeight = def.minimalHeight || 100;

      // Check if this item has a user-resized height
      if (key in resizedHeights) {
        itemHeights[key] = Math.max(resizedHeights[key], minHeight);
        isResized[key] = true;
        totalFixedHeight += itemHeights[key];
      } else if (def.height != null) {
        let height = 0;
        if (_.isString(def.height) && def.height.endsWith('px')) height = parseInt(def.height.slice(0, -2));
        else if (_.isString(def.height) && def.height.endsWith('%'))
          height = (clientHeight * parseFloat(def.height.slice(0, -1))) / 100;
        else height = parseInt(def.height);

        height = Math.max(height, minHeight);
        itemHeights[key] = height;
        isResized[key] = false;
        totalFixedHeight += height;
      } else {
        isResized[key] = false;
        totalFlexibleItems++;
      }
    }

    // Second pass: distribute remaining space to flexible items
    const availableHeightForFlexible = clientHeight - totalFixedHeight;
    for (const key of visibleItems) {
      if (!(key in itemHeights)) {
        const def = defs[key];
        const minHeight = def.minimalHeight || 100;
        let height = totalFlexibleItems > 0 ? availableHeightForFlexible / totalFlexibleItems : minHeight;
        height = Math.max(height, minHeight);
        itemHeights[key] = height;
      }
    }

    // Third pass: scale all non-resized items proportionally to fill clientHeight exactly
    const totalHeight = _.sum(Object.values(itemHeights));
    const resizedKeys = Object.keys(isResized).filter(k => isResized[k]);
    const nonResizedKeys = visibleItems.filter(k => !isResized[k]);
    
    if (totalHeight !== clientHeight && nonResizedKeys.length > 0) {
      const totalResizedHeight = _.sum(resizedKeys.map(k => itemHeights[k]));
      const totalNonResizedHeight = _.sum(nonResizedKeys.map(k => itemHeights[k]));
      const availableForNonResized = clientHeight - totalResizedHeight;
      
      if (totalNonResizedHeight > 0 && availableForNonResized > 0) {
        const ratio = availableForNonResized / totalNonResizedHeight;
        for (const key of nonResizedKeys) {
          itemHeights[key] = itemHeights[key] * ratio;
        }
      }
    } else if (totalHeight !== clientHeight && nonResizedKeys.length === 0) {
      // All items are resized, scale proportionally
      const ratio = clientHeight / totalHeight;
      for (const key of visibleItems) {
        itemHeights[key] = itemHeights[key] * ratio;
      }
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

    // Clean up resizedHeights - remove entries for items that no longer exist
    resizedHeights = _.pickBy(
      _.mapValues(resizedHeights, (v, k) => {
        if (k in itemHeights) return v;
        return undefined;
      }),
      v => v != null
    );
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
