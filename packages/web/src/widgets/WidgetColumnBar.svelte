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

    // First pass: calculate base heights and collect info
    let totalFixedHeight = 0;
    let totalFlexibleItems = 0;
    const itemHeights = {};

    for (const key of visibleItems) {
      const def = defs[key];
      const minHeight = def.minimalHeight || 100;

      if (def.height != null) {
        let height = 0;
        if (_.isString(def.height) && def.height.endsWith('px')) height = parseInt(def.height.slice(0, -2));
        else if (_.isString(def.height) && def.height.endsWith('%'))
          height = (clientHeight * parseFloat(def.height.slice(0, -1))) / 100;
        else height = parseInt(def.height);

        if (key in resizedHeights) height = resizedHeights[key];
        if (height < minHeight) height = minHeight;
        itemHeights[key] = height;
        totalFixedHeight += height;
      } else {
        totalFlexibleItems++;
      }
    }

    const availableHeightForFlexible = clientHeight - totalFixedHeight;

    // Second pass: distribute space
    for (const key of visibleItems) {
      const def = defs[key];
      const minHeight = def.minimalHeight || 100;
      if (def.height == null) {
        let height = availableHeightForFlexible / totalFlexibleItems;
        if (height < minHeight) height = minHeight;
        itemHeights[key] = height;
      }
    }

    const sumHeight = _.sum(Object.values(itemHeights));

    const ratio = clientHeight / sumHeight;
    for (const key of visibleItems) {
      itemHeights[key] = itemHeights[key] * ratio;
    }

    // third pass - overwrite with resized heights
    for (const key of visibleItems) {
      if (key in resizedHeights) {
        itemHeights[key] = resizedHeights[key];
      }
    }

    // fix total height again
    const ratio2 = clientHeight / _.sum(Object.values(itemHeights));
    for (const key of visibleItems) {
      itemHeights[key] = itemHeights[key] * ratio2;
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
