<script lang="ts">
  let domDiv;

  export let hideContent = false;
  export let fixedWidth = 0;

  export function scrollTop() {
    domDiv.scrollTop = 0;
  }
</script>

<div
  on:drop
  bind:this={domDiv}
  class:hideContent
  class:leftFixedWidth={!fixedWidth}
  data-testid={$$props['data-testid']}
  style:width={fixedWidth ? `${fixedWidth}px` : undefined}
>
  <slot />
</div>

<style>
  div {
    flex: 1 1;
    overflow-x: auto;
    overflow-y: auto;
  }

  div.leftFixedWidth {
    width: var(--dim-left-panel-width);
  }

  div.hideContent {
    visibility: hidden;
  }
</style>
