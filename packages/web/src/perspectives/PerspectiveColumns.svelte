<script lang="ts">
  import { each } from 'svelte/internal';
  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import PerspectiveColumnRow from './PerspectiveColumnRow.svelte';

  export let columns = [];

  function processFlatColumns(res, columns) {
    for (const col of columns) {
      res.push(col);
      if (col.isExpanded) {
        processFlatColumns(res, col.childNodes);
      }
    }
  }

  function getFlatColumns(columns) {
    const res = [];
    processFlatColumns(res, columns);
    return res;
  }
</script>

{#each getFlatColumns(columns) as column}
  <PerspectiveColumnRow {column} />
{/each}
