<script context="module">
  export function computeSplitterSize(initialValue, clientSize, customRatio, initialSizeRight) {
    if (customRatio != null) {
      return clientSize * customRatio;
    }
    if (initialSizeRight) {
      return clientSize - initialSizeRight;
    }
    if (_.isString(initialValue) && initialValue.startsWith('~') && initialValue.endsWith('px'))
      return clientSize - parseInt(initialValue.slice(1, -2));
    if (_.isString(initialValue) && initialValue.endsWith('px')) return parseInt(initialValue.slice(0, -2));
    if (_.isString(initialValue) && initialValue.endsWith('%'))
      return (clientSize * parseFloat(initialValue.slice(0, -1))) / 100;
    return clientSize / 2;
  }
</script>

<script>
  import _ from 'lodash';
  import FontIcon from '../icons/FontIcon.svelte';

  import splitterDrag from '../utility/splitterDrag';

  export let isSplitter = true;
  export let initialValue = undefined;
  export let initialSizeRight = undefined;
  export let hideFirst = false;

  export let allowCollapseChild1 = false;
  export let allowCollapseChild2 = false;

  let collapsed1 = false;
  let collapsed2 = false;

  export let size = 0;
  export let onChangeSize = null;
  let clientWidth;
  let customRatio = null;

  $: size = computeSplitterSize(initialValue, clientWidth, customRatio, initialSizeRight);

  $: if (onChangeSize) onChangeSize(size);
</script>

<div class="container" bind:clientWidth>
  {#if !hideFirst}
    <div
      class="child1"
      style={isSplitter
        ? collapsed1
          ? 'display:none'
          : collapsed2
            ? 'flex:1'
            : `width:${size}px; min-width:${size}px; max-width:${size}px}`
        : `flex:1`}
    >
      <slot name="1" />
    </div>
  {/if}
  {#if isSplitter}
    {#if !hideFirst}
      <div
        class="horizontal-split-handle"
        style={collapsed1 || collapsed2 ? 'display:none' : ''}
        use:splitterDrag={'clientX'}
        on:resizeSplitter={e => {
          size += e.detail;
          if (clientWidth > 0) customRatio = size / clientWidth;
        }}
      />
    {/if}
    <div
      class={collapsed1 ? 'child1' : 'child2'}
      style={collapsed2 ? 'display:none' : collapsed1 ? 'flex:1' : 'child2'}
    >
      <slot name="2" />
    </div>
  {/if}

  {#if allowCollapseChild1 && !collapsed2 && isSplitter}
    {#if collapsed1}
      <div
        class="collapse"
        style={`left: 0px`}
        on:click={() => {
          collapsed1 = false;
        }}
      >
        <FontIcon icon="icon chevron-double-right" />
      </div>
    {:else}
      <div
        class="collapse"
        style={`left: ${size - 16}px`}
        on:click={() => {
          collapsed1 = true;
        }}
      >
        <FontIcon icon="icon chevron-double-left" />
      </div>
    {/if}
  {/if}

  {#if allowCollapseChild2 && !collapsed1 && isSplitter}
    {#if collapsed2}
      <div
        class="collapse"
        style={`right: 0px`}
        on:click={() => {
          collapsed2 = false;
        }}
      >
        <FontIcon icon="icon chevron-double-left" />
      </div>
    {:else}
      <div
        class="collapse"
        style={`left: ${size}px`}
        on:click={() => {
          collapsed2 = true;
        }}
      >
        <FontIcon icon="icon chevron-double-right" />
      </div>
    {/if}
  {/if}
</div>

<style>
  .container {
    flex: 1;
    display: flex;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }

  .child1 {
    display: flex;
    position: relative;
    overflow: hidden;
  }

  .child2 {
    flex: 1;
    display: flex;
    position: relative;
    overflow: hidden;
  }

  .collapse {
    position: absolute;
    bottom: 16px;
    height: 40px;
    width: 16px;
    background: var(--theme-bg-2);
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 100;
  }

  .collapse:hover {
    color: var(--theme-font-hover);
    background: var(--theme-bg-3);
    cursor: pointer;
  }
</style>
