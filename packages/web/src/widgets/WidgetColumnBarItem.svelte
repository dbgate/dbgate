<script lang="ts">
  export let title;
  export let name;
  export let height = null;
  export let collapsed = null;

  let visible = !collapsed;
</script>

<div class="title" on:click={() => (visible = !visible)}>{title}</div>

{#if visible}
  <slot />
{/if}

<style>
  .title {
    padding: 5px;
    font-weight: bold;
    text-transform: uppercase;
    background-color: var(--theme-bg-2);
    border: 1px solid var(--theme-border);
  }
  .title:hover {
    background-color: var(--theme-bg-3);
  }
</style>
