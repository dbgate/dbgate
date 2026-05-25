<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let viewportRatio = 0.5;
  export let minimum;
  export let maximum;
  export let top = 0;

  const dispatch = createEventDispatcher();

  let height;
  let node;
  let _isProgrammatic = false;
  $: contentSize = viewportRatio > 0 ? Math.round(height / viewportRatio) : height;

  function handleScroll() {
    if (_isProgrammatic) {
      _isProgrammatic = false;
      return;
    }
    if (contentSize <= height) return;
    const position = node.scrollTop;
    const ratio = position / (contentSize - height);
    if (ratio < 0) return;
    let res = ratio * (maximum - minimum + 1) + minimum;
    dispatch('scroll', res);
  }

  export function scroll(value) {
    if (contentSize <= height) return;
    const position01 = (value - minimum) / (maximum - minimum + 1);
    const position = position01 * (contentSize - height);
    if (node) {
      const newTop = Math.floor(position);
      if (node.scrollTop !== newTop) {
        _isProgrammatic = true;
        node.scrollTop = newTop;
      }
    }
  }
</script>

<div bind:clientHeight={height} bind:this={node} on:scroll={handleScroll} class="main" style={`top: ${top}px`}>
  <div style={`height: ${contentSize}px`}>&nbsp;</div>
</div>

<style>
  .main {
    overflow-y: scroll;
    width: 20px;
    position: absolute;
    right: 0px;
    width: 20px;
    bottom: 16px;
  }
</style>
