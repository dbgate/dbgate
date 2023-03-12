<script>
  import _ from 'lodash';
  import FontIcon from '../icons/FontIcon.svelte';

  import splitterDrag from '../utility/splitterDrag';
  import { computeSplitterSize } from './HorizontalSplitter.svelte';

  export let isSplitter = true;
  export let initialValue = undefined;

  export let allowCollapseChild1 = false;
  export let allowCollapseChild2 = false;

  let size = 0;
  let clientHeight;

  let collapsed1 = false;
  let collapsed2 = false;
  let customRatio = null;

  $: size = computeSplitterSize(initialValue, clientHeight, customRatio);
</script>

<div class="container" bind:clientHeight>
  <div
    class="child1"
    style={isSplitter
      ? collapsed1
        ? 'display:none'
        : collapsed2
        ? 'flex:1'
        : `height:${size}px; min-height:${size}px; max-height:${size}px}`
      : `flex:1`}
  >
    <slot name="1" />
  </div>
  {#if isSplitter}
    <div
      class={'vertical-split-handle'}
      style={collapsed1 || collapsed2 ? 'display:none' : ''}
      use:splitterDrag={'clientY'}
      on:resizeSplitter={e => {
        size += e.detail;
        if (clientHeight > 0) customRatio = size / clientHeight;
      }}
    />
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
        style={`top: 0px`}
        on:click={() => {
          collapsed1 = false;
        }}
      >
        <FontIcon icon="icon chevron-double-down" />
      </div>
    {:else}
      <div
        class="collapse"
        style={`top: ${size - 16}px`}
        on:click={() => {
          collapsed1 = true;
        }}
      >
        <FontIcon icon="icon chevron-double-up" />
      </div>
    {/if}
  {/if}

  {#if allowCollapseChild2 && !collapsed1 && isSplitter}
    {#if collapsed2}
      <div
        class="collapse"
        style={`bottom: 0px`}
        on:click={() => {
          collapsed2 = false;
        }}
      >
        <FontIcon icon="icon chevron-double-up" />
      </div>
    {:else}
      <div
        class="collapse"
        style={`top: ${size}px`}
        on:click={() => {
          collapsed2 = true;
        }}
      >
        <FontIcon icon="icon chevron-double-down" />
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
    flex-direction: column;
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
    right: 16px;
    width: 40px;
    height: 16px;
    background: var(--theme-bg-2);
    display: flex;
    justify-content: center;
    z-index: 100;
  }

  .collapse:hover {
    color: var(--theme-font-hover);
    background: var(--theme-bg-3);
    cursor: pointer;
  }
</style>
