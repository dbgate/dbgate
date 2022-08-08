<script lang="ts">
  export let width;
  export let isFlex = false;
</script>

<div style={`max-width: ${width}px`} class:isFlex>
  <slot />
</div>

<style>
  div {
    flex: 1 1;
    overflow-y: auto;
    overflow-x: auto;
  }

  div.isFlex {
    display: flex;
  }
</style>
