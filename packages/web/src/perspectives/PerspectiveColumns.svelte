<script lang="ts">
  import { each } from 'svelte/internal';
  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import PerspectiveColumnRow from './PerspectiveColumnRow.svelte';

  export let columns = [];
</script>

{#each columns as column}
  <PerspectiveColumnRow {column} />
{/each}
