<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let viewportRatio = 0.5;
  export let minimum;
  export let maximum;

  const dispatch = createEventDispatcher();

  let width;
  let node;
  let _isProgrammatic = false;
  $: scrollRange = Math.max(0, (maximum || 0) - (minimum || 0));
  $: safeViewportRatio = viewportRatio > 0 && Number.isFinite(viewportRatio) ? Math.min(Math.max(viewportRatio, 0.01), 1) : 1;
  $: contentSize =
    scrollRange > 0 ? Math.max((width || 0) + 1, Math.round((width || 0) / safeViewportRatio)) : width;

  function scrollLeftToValue(position) {
    if (contentSize <= width || scrollRange <= 0) return minimum;
    const ratio = position / (contentSize - width);
    return minimum + ratio * scrollRange;
  }

  function valueToScrollLeft(value) {
    if (contentSize <= width || scrollRange <= 0) return 0;
    const ratio = (value - minimum) / scrollRange;
    return Math.min(Math.max(ratio * (contentSize - width), 0), contentSize - width);
  }

  function handleScroll() {
    if (_isProgrammatic) {
      _isProgrammatic = false;
      return;
    }
    if (contentSize <= width) return;
    const position = node.scrollLeft;
    dispatch('scroll', scrollLeftToValue(position));
  }

  export function scroll(value) {
    if (contentSize <= width) return;
    const position = valueToScrollLeft(value);
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
  <div class="content" style={`width: ${contentSize}px`}>&nbsp;</div>
</div>

<style>
  .main {
    overflow-x: scroll;
    overflow-y: hidden;
    height: 16px;
    position: absolute;
    bottom: 0;
    right: 0;
    left: 0;
  }

  .content {
    height: 16px;
  }
</style>
