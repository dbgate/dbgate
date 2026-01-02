<script lang="ts">
  export let noMargin = false;
  export let altsearchbox = false;
  export let filter = null;
</script>

<div class:useMargin={!noMargin} class:altsearchbox class:hasFilter={!!filter}><slot /></div>

<style>
  div {
    display: flex;
    border-bottom: var(--theme-searchbox-border);
    background-color: var(--theme-searchbox-background);
    border: var(--theme-searchbox-border);
  }

  div.altsearchbox {
    background-color: var(--theme-altsearchbox-background);
    border: var(--theme-altsearchbox-border);
  }

  div.useMargin {
    border-radius: 4px;
    margin: 3px 5px;
  }
  div.hasFilter {
    background-color: var(--theme-searchbox-background-filtered);
  }
</style>
