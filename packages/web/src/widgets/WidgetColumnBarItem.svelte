<script lang="ts">
  import _ from 'lodash';

  import { getContext } from 'svelte';

  import { writable } from 'svelte/store';

  import WidgetTitle from './WidgetTitle.svelte';
  import splitterDrag from '../utility/splitterDrag';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';

  export let title;
  export let skip = false;
  export let positiveCondition = true;
  export let height = null;
  export let collapsed = null;

  export let storageName = null;
  export let onClose = null;
  export let minimalHeight = 100;
  export let name;

  // let size = 0;

  // const dynamicProps = writable({
  //   splitterVisible: false,
  //   visibleItemsCount: 0,
  // });

  const pushWidgetItemDefinition = getContext('pushWidgetItemDefinition') as any;
  const updateWidgetItemDefinition = getContext('updateWidgetItemDefinition') as any;
  // const widgetColumnBarHeight = getContext('widgetColumnBarHeight') as any;
  const widgetResizeItem = getContext('widgetResizeItem') as any;
  const widgetColumnBarComputed = getContext('widgetColumnBarComputed') as any;
  pushWidgetItemDefinition(name, {
    collapsed,
    height,
    skip,
    positiveCondition,
  });

  $: updateWidgetItemDefinition(name, { collapsed: !visible, height, skip, positiveCondition });

  // $: setInitialSize(height, $widgetColumnBarHeight);

  // $: if (storageName && $widgetColumnBarHeight > 0) {
  //   setLocalStorage(storageName, { relativeHeight: size / $widgetColumnBarHeight, visible });
  // }

  let visible =
    storageName && getLocalStorage(storageName) && getLocalStorage(storageName).visible != null
      ? getLocalStorage(storageName).visible
      : !collapsed;

  $: computed = $widgetColumnBarComputed[name] || {};
  $: collapsible = computed.visibleItemsCount != 1 || !visible;
  $: size = computed.size ?? 100;
  $: splitterVisible = computed.splitterVisible;
</script>

{#if !skip && positiveCondition}
  <WidgetTitle
    clickable={collapsible}
    on:click={collapsible ? () => (visible = !visible) : null}
    data-testid={$$props['data-testid']}
    {onClose}>{title}</WidgetTitle
  >

  {#if visible}
    <div
      class="wrapper"
      style={splitterVisible ? `height:${size}px` : 'flex: 1 1 0'}
      data-testid={$$props['data-testid'] ? `${$$props['data-testid']}_content` : undefined}
    >
      <slot />
    </div>

    {#if splitterVisible}
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
