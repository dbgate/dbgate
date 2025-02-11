<script lang="ts">
  import XmlHighlighter from './XmlHighlighter.svelte';

  export let selection;
</script>

{#each selection as cell}
  <XmlHighlighter code={cell.value} />
{/each}
