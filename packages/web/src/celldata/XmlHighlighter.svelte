<script>
  import hljs from 'highlight.js/lib/core';
  import xmlGrammar from './xmlGrammar';
  import xmlFormat from 'xml-formatter';
  import { afterUpdate, onMount } from 'svelte';

  export let code = '';

  $: formattedCode = xmlFormat(code, { indentation: '  ' });

  onMount(() => {
    hljs.registerLanguage('xml', xmlGrammar);
  });

  afterUpdate(() => {
    if (codeBlock) {
      hljs.highlightElement(codeBlock);
    }
  });

  let codeBlock;
</script>

{#key formattedCode}
  <pre bind:this={codeBlock}>{formattedCode}</pre>
{/key}

<style>
  pre {
    margin: 0;
    padding: 0;
    padding: 0.5em;
  }
</style>
