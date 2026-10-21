<script lang="ts">
  export let noMargin = false;
  export let altsearchbox = false;
  export let filter = null;
  export let fillFlex = false;
</script>

<div class:useMargin={!noMargin} class:altsearchbox class:hasFilter={!!filter} class:fillFlex><slot /></div>

<style>
  div {
    display: flex;
    border-bottom: var(--theme-searchbox-border);
    background-color: var(--theme-searchbox-background);
    border: var(--theme-searchbox-border);
    transition:
      border-color var(--dim-transition-fast),
      box-shadow var(--dim-transition-fast);
  }

  div.altsearchbox {
    background-color: var(--theme-altsearchbox-background);
    border: var(--theme-altsearchbox-border);
  }

  div:focus-within {
    border-color: var(--theme-input-border-focus-color);
  }

  div.useMargin {
    border-radius: var(--dim-radius-md);
    margin: 4px 6px;
    overflow: hidden;
  }

  div.useMargin:focus-within {
    box-shadow: var(--theme-input-focus-ring);
  }
  div.hasFilter {
    background-color: var(--theme-searchbox-background-filtered);
  }

  .fillFlex {
    flex: 1;
  }
</style>
