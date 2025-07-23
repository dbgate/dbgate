<script>
  /* npm i highlight.js sql-formatter */
  import hljs from 'highlight.js/lib/core';
  import sqlGrammar from './sqlGrammar';
  import { onMount, afterUpdate } from 'svelte';

  export let code = '';

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
  <pre bind:this={domCode} class="sql">{code}</pre>
{/key}

<style>
  pre {
    margin: 0;
    padding: 0;
    padding: 0.5em;
  }
</style>
