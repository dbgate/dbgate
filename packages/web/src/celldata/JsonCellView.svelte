<script lang="ts">
  import JSONTree from 'svelte-json-tree';
  import ErrorInfo from '../elements/ErrorInfo.svelte';

  export let selection;

  let json = null;
  let error = null;

  $: try {
    json = JSON.parse(selection[0].value);
    error = null;
  } catch (err) {
    error = err.message;
  }
</script>

{#if error}
  <ErrorInfo message="Error parsing JSON" />
{:else}
  <div class="outer">
    <div class="inner">
      <JSONTree value={json} />
    </div>
  </div>
{/if}

<style>
  .outer {
    flex: 1;
    position: relative;
  }
  .inner {
    overflow: scroll;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }

  :global(.theme-type-dark) .inner {
    --json-tree-string-color: #efc5c5;
    --json-tree-symbol-color: #efc5c5;
    --json-tree-boolean-color: #a6b3f5;
    --json-tree-function-color: #a6b3f5;
    --json-tree-number-color: #bfbdf2;
    --json-tree-label-color: #e9aaed;
    --json-tree-arrow-color: #d4d4d4;
    --json-tree-null-color: #dcdcdc;
    --json-tree-undefined-color: #dcdcdc;
    --json-tree-date-color: #dcdcdc;
  }
</style>
