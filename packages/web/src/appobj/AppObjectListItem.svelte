<script lang="ts">
  import ExpandIcon from '../icons/ExpandIcon.svelte';
  import { tick } from 'svelte';

  export let module;
  export let data;
  export let subItemsComponent;
  export let expandOnClick;
  export let isExpandable = undefined;

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

{#if subItemsComponent}
  <svelte:component this={module.default} {data} on:click={handleExpand}>
    <span class="expand-icon" slot="prefix">
      {#if expandable}
        <ExpandIcon {isExpanded} />
      {:else}
        <ExpandIcon isBlank />
      {/if}
    </span>
  </svelte:component>
{:else}
  <svelte:component this={module.default} {data} on:click={handleExpand} />
{/if}

{#if isExpanded && subItemsComponent}
  <div class="subitems">
    <svelte:component this={subItemsComponent} {data} />
  </div>
{/if}

<style>
  .expand-icon {
    margin-right: 3px;
  }
  .subitems {
    margin-left: 28px;
  }
</style>
