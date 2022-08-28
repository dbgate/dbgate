<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let order;
  export let orderIndex;
</script>

{#if order == 'ASC'}
  <span class="icon">
    <FontIcon icon="img sort-asc" />
    {#if orderIndex >= 0}
      <span class="color-icon-green order-index">{orderIndex + 1}</span>
    {/if}
  </span>
{/if}
{#if order == 'DESC'}
  <span class="icon">
    <FontIcon icon="img sort-desc" />
    {#if orderIndex >= 0}
      <span class="color-icon-green order-index">{orderIndex + 1}</span>
    {/if}
  </span>
{/if}
