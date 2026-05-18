<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let viewportRatio = 0.5;
  export let minimum;
  export let maximum;

  const dispatch = createEventDispatcher();

  let width;
  let node;
  let _isProgrammatic = false;
  $: contentSize = viewportRatio > 0 ? Math.round(width / viewportRatio) : width;

  function handleScroll() {
    if (_isProgrammatic) {
      _isProgrammatic = false;
      return;
    }
    if (contentSize <= width) return;
    const position = node.scrollLeft;
    const ratio = position / (contentSize - width);
    if (ratio < 0) return;
    const res = ratio * (maximum - minimum + 1) + minimum;
    dispatch('scroll', res);
  }

  export function scroll(value) {
    if (contentSize <= width) return;
    const position01 = (value - minimum) / (maximum - minimum + 1);
    const position = position01 * (contentSize - width);
    if (node) {
      const newLeft = Math.floor(position);
      if (node.scrollLeft !== newLeft) {
        _isProgrammatic = true;
        node.scrollLeft = newLeft;
      }
    }
  }
</script>

<div bind:clientWidth={width} bind:this={node} on:scroll={handleScroll} class="main">
  <div style={`width: ${contentSize}px`}>&nbsp;</div>
</div>

<style>
  .main {
    overflow-x: scroll;
    height: 16px;
    position: absolute;
    bottom: 0;
    right: 0;
    left: 0;
  }
</style>
