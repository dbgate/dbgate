<script lang="ts">
  import _ from 'lodash';

  import { getContext } from 'svelte';
  import { slide } from 'svelte/transition';
  import { tweened } from 'svelte/motion';
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
  import { cubicOut } from 'svelte/easing';
  // import { getLocalStorage, setLocalStorage } from '../utility/storageCache';

  export let title;
  export let skip = false;
  export let positiveCondition = true;
  export let height = null;
  export let collapsed = null;
  export let storeHeight = false;
  export let altsidebar = false;

  // export let storageName = null;
  export let onClose = null;
  export let minimalHeight = 50;
  export let name;

  let lastContentHeight = 0;
  let displayedContentHeight = 0;
  const animatedHeight = tweened(0, { duration: 140, easing: cubicOut });

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
  $: if (!computed.collapsed && computed.contentHeight > 0) lastContentHeight = computed.contentHeight;
  $: displayedContentHeight = computed.collapsed
    ? lastContentHeight
    : computed.contentHeight || lastContentHeight || minimalHeight;
  $: animatedHeight.set(computed.collapsed ? 0 : displayedContentHeight, {
    duration: computed.collapsed ? 100 : 140,
    easing: cubicOut,
  });
</script>

{#if !skip && positiveCondition}
  <WidgetTitle
    clickable={computed.clickableTitle}
    on:click={computed.clickableTitle ? () => toggleWidgetCollapse(name) : null}
    data-testid={$$props['data-testid']}
    {altsidebar}
    {onClose}
    collapsed={computed.collapsed}>{title}</WidgetTitle
  >

  {#if !computed.collapsed || $animatedHeight > 0}
    <div
      class="wrapper"
      data-testid={$$props['data-testid'] ? `${$$props['data-testid']}_content` : undefined}
      style={`${computed.collapsed && $animatedHeight === 0 ? 'display: none;' : ''}`}
    >
      <div class="wrapper-inner" style={`height:${$animatedHeight}px`}>
        <slot />
      </div>
    </div>

    {#if computed.splitterVisible && !computed.collapsed}
      <div
        class="vertical-split-handle"
        use:splitterDrag={'clientY'}
        on:resizeSplitter={e => widgetResizeItem(name, e.detail)}
        in:slide|local={{ duration: 140, easing: cubicOut, delay: 140 }}
        out:slide|local={{ duration: 50, easing: cubicOut }}
      />
    {/if}
  {/if}
{/if}

<style>
  .wrapper {
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
  }

  .wrapper-inner {
    flex-direction: column;
    display: flex;
  }
</style>
