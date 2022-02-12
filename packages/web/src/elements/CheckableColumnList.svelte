<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  export let selectedColumns;
  export let allColumns;
  export let disabled = false;

  function toggleColumn(column) {
    if (selectedColumns.includes(column)) selectedColumns = selectedColumns.filter(x => x != column);
    else selectedColumns = [...selectedColumns, column];
  }
</script>

<div>
  <FormStyledButton value="All" on:click={() => (selectedColumns = allColumns)} {disabled} />
  <FormStyledButton value="None" on:click={() => (selectedColumns = [])} {disabled} />
</div>
<div class="list">
  {#each allColumns as column}
    <div>
      <input
        type="checkbox"
        {disabled}
        checked={selectedColumns.includes(column)}
        on:change={() => toggleColumn(column)}
      />

      <span on:click={() => toggleColumn(column)} class="label">
        {column}
      </span>
    </div>
  {/each}
</div>

<style>
  .list {
    max-height: 25vh;
    overflow: scroll;
    user-select: none;
  }
  .label {
    cursor: pointer;
  }
</style>
