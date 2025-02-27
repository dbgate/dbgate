<script lang="ts">
  import XmlHighlighter from './XmlHighlighter.svelte';

  export let selection;
</script>

<div class="wrapper">
  {#each selection as cell}
    <XmlHighlighter code={cell.value} />
  {/each}
</div>

<style>
  .wrapper {
    overflow: scroll;
    position: absolute;
    background: var(--token-base);
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
</style>
