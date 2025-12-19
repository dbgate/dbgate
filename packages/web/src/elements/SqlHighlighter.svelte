<script>
  /* npm i highlight.js sql-formatter */
  import hljs from 'highlight.js/lib/core';
  import sqlGrammar from './sqlGrammar';
  import { onMount, afterUpdate } from 'svelte';

  export let code = '';
  export let inline = false;
  export let onClick = null;

  let domCode;

  onMount(() => {
    hljs.registerLanguage('sql', sqlGrammar);

    // first paint
    if (domCode) {
      hljs.highlightElement(domCode);
    }
  });

  afterUpdate(() => {
    if (domCode) {
      hljs.highlightElement(domCode);
    }
  });
</script>

{#key code}
  <!--
    The `sql` class hints the language; highlight.js will
    read it even though we register the grammar explicitly.
  -->
  {#if inline}
    <span bind:this={domCode} class="sql" class:clickable={!!onClick} on:click={onClick}>{code}</span>
  {:else}
    <pre bind:this={domCode} class="sql" class:clickable={!!onClick} on:click={onClick}>{code}</pre>
  {/if}
{/key}

<style>
  pre {
    margin: 0;
    padding: 0;
    padding: 0.5em;
  }

  .clickable {
    cursor: pointer;
  }
</style>
