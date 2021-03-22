<script>
  import _ from 'lodash';

  import splitterDrag from '../utility/splitterDrag';
  import { computeSplitterSize } from './HorizontalSplitter.svelte';

  export let isSplitter = true;
  export let initialValue = undefined;

  let size = 0;
  let clientHeight;

  $: size = computeSplitterSize(initialValue, clientHeight);
</script>

<div class="container" bind:clientHeight>
  <div class="child1" style={isSplitter ? `height:${size}px; min-height:${size}px; max-height:${size}px}` : `flex:1`}>
    <slot name="1" />
  </div>
  {#if isSplitter}
    <div class="vertical-split-handle" use:splitterDrag={'clientY'} on:resizeSplitter={e => (size += e.detail)} />
    <div class="child2">
      <slot name="2" />
    </div>
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
</style>
