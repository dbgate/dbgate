<script lang="ts">
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import JSONTree from '../jsontree/JSONTree.svelte';

  export let selection;
  export let showWholeRow = false;
  export let expandAll = false;

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
      <JSONTree value={json} {expandAll} expanded />
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
</style>
