<script lang="ts">
  import _ from 'lodash';

  import { getContext } from 'svelte';

  import { writable } from 'svelte/store';

  import WidgetTitle from './WidgetTitle.svelte';
  import splitterDrag from '../utility/splitterDrag';

  export let title;
  export let name;
  export let skip = false;
  export let height = null;
  export let collapsed = null;

  let size = 0;

  const dynamicProps = writable({
    splitterVisible: false,
  });

  const pushWidgetItemDefinition = getContext('pushWidgetItemDefinition') as any;
  const updateWidgetItemDefinition = getContext('updateWidgetItemDefinition') as any;
  const widgetColumnBarHeight = getContext('widgetColumnBarHeight') as any;
  const widgetItemIndex = pushWidgetItemDefinition(
    {
      collapsed,
      height,
      skip,
    },
    dynamicProps
  );

  $: updateWidgetItemDefinition(widgetItemIndex, { collapsed: !visible, height, skip });

  $: setInitialSize(height, $widgetColumnBarHeight);

  function setInitialSize(initialSize, parentHeight) {
    if (_.isString(initialSize) && initialSize.endsWith('px')) size = parseInt(initialSize.slice(0, -2));
    else if (_.isString(initialSize) && initialSize.endsWith('%'))
      size = (parentHeight * parseFloat(initialSize.slice(0, -1))) / 100;
    else size = parentHeight / 3;
  }

  let visible = !collapsed;
</script>

{#if !skip}
  <WidgetTitle on:click={() => (visible = !visible)}>{title}</WidgetTitle>

  {#if visible}
    <div class="wrapper" style={$dynamicProps.splitterVisible ? `height:${size}px` : 'flex: 1 1 0'}>
      <slot />
    </div>

    {#if $dynamicProps.splitterVisible}
      <div class="vertical-split-handle" use:splitterDrag={'clientY'} on:resizeSplitter={e => (size += e.detail)} />
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
