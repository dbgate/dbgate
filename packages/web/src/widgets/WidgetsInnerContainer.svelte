<script lang="ts">
  let domDiv;

  export let hideContent = false;

  export function scrollTop() {
    domDiv.scrollTop = 0;
  }
</script>

<div on:drop bind:this={domDiv} class:hideContent data-testid={$$props['data-testid']}><slot /></div>

<style>
  div {
    flex: 1 1;
    overflow-x: auto;
    overflow-y: auto;
    width: var(--dim-left-panel-width);
  }

  .hideContent {
    visibility: hidden;
  }
</style>
