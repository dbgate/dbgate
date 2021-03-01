<script lang="ts" context="module">
  function getExpandIcon(expandable, subItemsComponent, isExpanded, expandIconFunc) {
    if (!subItemsComponent) return null;
    if (!expandable) return 'icon invisible-box';
    return expandIconFunc(isExpanded);
  }
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import { plusExpandIcon } from '../icons/expandIcons';

  export let module;
  export let data;
  export let subItemsComponent;
  export let expandOnClick;
  export let isExpandable = undefined;
  export let expandIconFunc = plusExpandIcon;

  let isExpanded = false;

  async function handleExpand() {
    if (subItemsComponent && expandOnClick) {
      await tick();
      isExpanded = !isExpanded;
    }
  }

  $: expandable = data && isExpandable && isExpandable(data);

  $: if (!expandable && isExpanded) isExpanded = false;
</script>

<svelte:component
  this={module.default}
  {data}
  on:click={handleExpand}
  on:expand={handleExpand}
  expandIcon={getExpandIcon(expandable, subItemsComponent, isExpanded, expandIconFunc)}
/>

{#if isExpanded && subItemsComponent}
  <div class="subitems">
    <svelte:component this={subItemsComponent} {data} />
  </div>
{/if}

<style>
  .subitems {
    margin-left: 28px;
  }
</style>
