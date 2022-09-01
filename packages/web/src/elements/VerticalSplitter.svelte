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

  $: size = computeSplitterSize(initialValue, clientHeight);
</script>

<div class="container" bind:clientHeight>
  {#if collapsed1}
    <div class="child1" style={`flex:1`}>
      <slot name="2" />
    </div>
  {:else if collapsed2}
    <div class="child1" style={`flex:1`}>
      <slot name="1" />
    </div>
  {:else}
    <div class="child1" style={isSplitter ? `height:${size}px; min-height:${size}px; max-height:${size}px}` : `flex:1`}>
      <slot name="1" />
    </div>
    {#if isSplitter}
      <div class="vertical-split-handle" use:splitterDrag={'clientY'} on:resizeSplitter={e => (size += e.detail)} />
      <div class="child2">
        <slot name="2" />
      </div>
    {/if}
  {/if}

  {#if allowCollapseChild1 && !collapsed2}
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

  {#if allowCollapseChild2 && !collapsed1}
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
  }

  .collapse:hover {
    color: var(--theme-font-hover);
    background: var(--theme-bg-3);
    cursor: pointer;
  }
</style>
