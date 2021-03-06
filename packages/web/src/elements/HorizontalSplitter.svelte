<script context="module">
  export function computeSplitterSize(initialValue, clientSize) {
    if (_.isString(initialValue) && initialValue.endsWith('px')) return parseInt(initialValue.slice(0, -2));
    if (_.isString(initialValue) && initialValue.endsWith('%'))
      return (clientSize * parseFloat(initialValue.slice(0, -1))) / 100;
    return clientSize / 2;
  }
</script>

<script>
  import _ from 'lodash';

  import splitterDrag from '../utility/splitterDrag';

  export let isSplitter = true;
  export let initialValue = undefined;

  let size = 0;
  let clientWidth;

  $: size = computeSplitterSize(initialValue, clientWidth);
</script>

<div class="container" bind:clientWidth>
  <div class="child1" style={isSplitter ? `width:${size}px; min-width:${size}px; max-width:${size}px}` : `flex:1`}>
    <slot name="1" />
  </div>
  {#if isSplitter}
    <div class="horizontal-split-handle" use:splitterDrag={'clientX'} on:resizeSplitter={e => (size += e.detail)} />
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
