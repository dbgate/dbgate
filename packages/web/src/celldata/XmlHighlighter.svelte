<script>
  import hljs from 'highlight.js/lib/core';
  import xmlGrammar from './xmlGrammar';
  import formatXml from './formatXml';
  import { afterUpdate, onMount } from 'svelte';

  import 'highlight.js/styles/vs.css';

  export let code = '';

  $: formattedCode = formatXml(code);

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
