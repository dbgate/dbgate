<script lang="ts">
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import JSONTree from '../jsontree/JSONTree.svelte';

  export let selection;
  export let showWholeRow = false;

  let json = null;
  let error = null;

  $: try {
    if (showWholeRow) {
      if (selection?.length == 1) {
        json = selection[0].rowData;
      } else {
        json = selection.map(x => x.rowData);
      }
    } else {
      const value = selection[0].value;
      json = _.isPlainObject(value) || _.isArray(value) ? value : JSON.parse(value);
    }
    error = null;
  } catch (err) {
    error = err.message;
  }
</script>

{#if error}
  <ErrorInfo message="Error parsing JSON" alignTop />
{:else}
  <div class="outer">
    <div class="inner">
      <JSONTree value={json} expanded />
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
    --json-tree-string-color: #ffc5c5;
    --json-tree-symbol-color: #ffc5c5;
    --json-tree-boolean-color: #b6c3ff;
    --json-tree-function-color: #b6c3ff;
    --json-tree-number-color: #bfbdff;
    --json-tree-label-color: #e9aaed;
    --json-tree-arrow-color: #d4d4d4;
    --json-tree-null-color: #dcdcdc;
    --json-tree-undefined-color: #dcdcdc;
    --json-tree-date-color: #dcdcdc;
  }
</style>
