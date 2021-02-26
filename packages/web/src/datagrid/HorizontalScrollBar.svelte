<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let viewportRatio = 0.5;
  export let minimum;
  export let maximum;

  const dispatch = createEventDispatcher();

  let width;
  let node;
  $: contentSize = Math.round(width / viewportRatio);

  function handleScroll() {
    const position = node.scrollLeft;
    const ratio = position / (contentSize - width);
    if (ratio < 0) return 0;
    const res = ratio * (maximum - minimum + 1) + minimum;
    dispatch('scroll', Math.floor(res + 0.3));
  }

  export function scroll(value) {
    const position01 = (value - minimum) / (maximum - minimum + 1);
    const position = position01 * (contentSize - width);
    if (node) node.scrollLeft = Math.floor(position);
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
