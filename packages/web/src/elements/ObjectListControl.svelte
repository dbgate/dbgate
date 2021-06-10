<script lang="ts">
  import TableControl from './TableControl.svelte';

  export let title;
  export let collection;
  export let columns;
  export let showIfEmpty = false;
  export let clickable;

</script>

{#if collection?.length > 0 || showIfEmpty}
  <div class="wrapper">
    <div class="header">
      <span class="title">{title}</span>
    </div>
    <div class="body">
      <TableControl
        rows={collection || []}
        columns={[
          {
            fieldName: 'displayName',
            header: 'Name',
            slot: -1,
          },
          ...columns,
        ]}
        {clickable}
        on:clickrow
      >
        <svelte:fragment slot="-1" let:row>
          <slot name="name" {row} />
        </svelte:fragment>
        <svelte:fragment slot="0" let:row>
          <slot name="0" {row} />
        </svelte:fragment>
        <svelte:fragment slot="1" let:row>
          <slot name="1" {row} />
        </svelte:fragment>
        <svelte:fragment slot="2" let:row>
          <slot name="2" {row} />
        </svelte:fragment>
        <svelte:fragment slot="3" let:row>
          <slot name="3" {row} />
        </svelte:fragment>
        <svelte:fragment slot="4" let:row>
          <slot name="4" {row} />
        </svelte:fragment>
        <svelte:fragment slot="5" let:row>
          <slot name="5" {row} />
        </svelte:fragment>
        <svelte:fragment slot="6" let:row>
          <slot name="6" {row} />
        </svelte:fragment>
        <svelte:fragment slot="7" let:row>
          <slot name="7" {row} />
        </svelte:fragment>
      </TableControl>
    </div>
  </div>
{/if}

<style>
  .wrapper {
    margin-bottom: 20px;
  }

  .header {
    background-color: var(--theme-bg-1);
    padding: 5px;
  }

  .title {
    font-weight: bold;
    margin-left: 5px;
  }

  .body {
    margin: 20px;
  }

</style>
