<script alng="ts">
  import DropDownButton from '../buttons/DropDownButton.svelte';
  import TextField from '../forms/TextField.svelte';

  export let tableInfo;
  export let onChange;
  export let value;
</script>

{#if tableInfo}
  <div class="wrapper">
    <TextField {value} on:input={e => onChange(e.target.value)} />
    <DropDownButton
      menu={() => {
        return tableInfo.columns.map(opt => ({
          text: opt.columnName,
          onClick: () => onChange(opt.columnName),
        }));
      }}
    />
  </div>
{:else}
  <TextField {value} on:input={e => onChange(e.target.value)} />
{/if}

<style>
  .wrapper {
    display: flex;
  }
</style>
