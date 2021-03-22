<script lang="ts">
  export let width;
</script>

<div style={`max-width: ${width}px`}>
  <slot />
</div>

<style>
  div {
    flex: 1 1;
    overflow-y: auto;
    overflow-x: auto;
  }
</style>
