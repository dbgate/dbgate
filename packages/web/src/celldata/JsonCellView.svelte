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
</style>
