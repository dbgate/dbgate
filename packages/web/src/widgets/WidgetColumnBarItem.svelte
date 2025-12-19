<script lang="ts">
  import _ from 'lodash';

  import { getContext } from 'svelte';
  import type { Readable } from 'svelte/store';

  import WidgetTitle from './WidgetTitle.svelte';
  import splitterDrag from '../utility/splitterDrag';
  import {
    PushWidgetBarItemDefinitionFunction,
    UpdateWidgetBarItemDefinitionFunction,
    WidgetBarComputedResult,
    WidgetBarComputedProps,
    ToggleCollapseWidgetItemFunction,
    ResizeWidgetItemFunction,
  } from '../utility/widgetBarResizing';
  // import { getLocalStorage, setLocalStorage } from '../utility/storageCache';

  export let title;
  export let skip = false;
  export let positiveCondition = true;
  export let height = null;
  export let collapsed = null;
  export let storeHeight = false;

  // export let storageName = null;
  export let onClose = null;
  export let minimalHeight = 50;
  export let name;

  // let size = 0;

  // const dynamicProps = writable({
  //   splitterVisible: false,
  //   visibleItemsCount: 0,
  // });

  const pushWidgetItemDefinition = getContext('pushWidgetItemDefinition') as PushWidgetBarItemDefinitionFunction;
  const updateWidgetItemDefinition = getContext('updateWidgetItemDefinition') as UpdateWidgetBarItemDefinitionFunction;
  // const widgetColumnBarHeight = getContext('widgetColumnBarHeight') as any;
  const widgetResizeItem = getContext('widgetResizeItem') as ResizeWidgetItemFunction;
  const widgetColumnBarComputed = getContext('widgetColumnBarComputed') as Readable<WidgetBarComputedResult>;
  const toggleWidgetCollapse = getContext('toggleWidgetCollapse') as ToggleCollapseWidgetItemFunction;

  pushWidgetItemDefinition({
    name,
    collapsed,
    height,
    skip: skip || !positiveCondition,
    minimalContentHeight: minimalHeight,
    storeHeight,
  });

  $: updateWidgetItemDefinition(name, { collapsed, height, skip: skip || !positiveCondition });

  // $: setInitialSize(height, $widgetColumnBarHeight);

  // $: if (storageName && $widgetColumnBarHeight > 0) {
  //   setLocalStorage(storageName, { relativeHeight: size / $widgetColumnBarHeight, visible });
  // }

  $: computed = $widgetColumnBarComputed[name] || ({} as WidgetBarComputedProps);
</script>

{#if !skip && positiveCondition}
  <WidgetTitle
    clickable={computed.clickableTitle}
    on:click={computed.clickableTitle ? () => toggleWidgetCollapse(name) : null}
    data-testid={$$props['data-testid']}
    {onClose}>{title}</WidgetTitle
  >

  {#if !computed.collapsed}
    <div
      class="wrapper"
      style={computed.splitterVisible ? `height:${computed.contentHeight}px` : 'flex: 1 1 0'}
      data-testid={$$props['data-testid'] ? `${$$props['data-testid']}_content` : undefined}
    >
      <slot />
    </div>

    {#if computed.splitterVisible}
      <div
        class="vertical-split-handle"
        use:splitterDrag={'clientY'}
        on:resizeSplitter={e => widgetResizeItem(name, e.detail)}
      />
    {/if}
  {/if}
{/if}

<style>
  .wrapper {
    overflow: hidden;
    position: relative;
    flex-direction: column;
    display: flex;
  }
</style>
