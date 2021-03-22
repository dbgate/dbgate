<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let viewportRatio = 0.5;
  export let minimum;
  export let maximum;

  const dispatch = createEventDispatcher();

  let height;
  let node;
  $: contentSize = Math.round(height / viewportRatio);

  function handleScroll() {
    const position = node.scrollTop;
    const ratio = position / (contentSize - height);
    if (ratio < 0) return 0;
    let res = ratio * (maximum - minimum + 1) + minimum;
    dispatch('scroll', Math.floor(res + 0.3));
  }

  export function scroll(value) {
    const position01 = (value - minimum) / (maximum - minimum + 1);
    const position = position01 * (contentSize - height);
    if (node) node.scrollTop = Math.floor(position);
  }
</script>

<div bind:clientHeight={height} bind:this={node} on:scroll={handleScroll} class="main">
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
    top: 0;
  }
</style>
