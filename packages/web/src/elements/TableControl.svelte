<script lang="ts">
  import _ from 'lodash';

  import { compact } from 'lodash';
  import { onMount } from 'svelte';

  interface TableColumn {
    fieldName: string;
    header: string;
    component?: any;
    getProps?: any;
    formatter?: any;
  }

  export let columns: TableColumn[];
  export let rows;
  export let focusOnCreate = false;
  export let selectable = false;
  export let selectedIndex = 0;

  $: columnList = _.compact(_.flatten(columns));

  let domTable;

  onMount(() => {
    if (focusOnCreate) domTable.focus();
  });
</script>

<table bind:this={domTable} class:selectable>
  <thead>
    <tr>
      {#each columnList as col}
        <td>{col.header}</td>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each rows as row, index}
      <tr
        class:selected={selectable && selectedIndex == index}
        on:click={() => {
          if (selectable) {
            selectedIndex = index;
            domTable.focus();
          }
        }}
      >
        {#each columnList as col}
          <td>
            {#if col.component}
              <svelte:component this={col.component} {...col.getProps(row)} />
            {:else if col.formatter}
              {col.formatter(row)}
            {:else}
              {row[col.fieldName]}
            {/if}
          </td>
        {/each}
      </tr>
    {/each}
  </tbody>
</table>

<style>
  table {
    border-collapse: collapse;
    width: 100%;
  }
  table.selectable {
    user-select: none;
  }
  tbody tr {
    background: var(--theme-bg-0);
  }
  tbody tr.selected {
    background: var(--theme-bg-selected);
  }
  thead td {
    border: 1px solid var(--theme-border);
    background-color: var(--theme-bg-1);
    padding: 5px;
  }
  tbody td {
    border: 1px solid var(--theme-border);
    padding: 5px;
  }
</style>
