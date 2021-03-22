<script lang="ts">
  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import InlineButton from '../elements/InlineButton.svelte';

  import FontIcon from '../icons/FontIcon.svelte';
  import keycodes from '../utility/keycodes';

  export let column;
  export let baseTable;
  export let formDisplay;

  let domEditor;
  $: value = formDisplay.getKeyValue(column.columnName);

  const applyFilter = () => {
    formDisplay.requestKeyValue(column.columnName, domEditor.value);
  };

  const cancelFilter = () => {
    formDisplay.cancelRequestKey();
    formDisplay.reload();
  };

  const handleKeyDown = ev => {
    if (ev.keyCode == keycodes.enter) {
      applyFilter();
    }
    if (ev.keyCode == keycodes.escape) {
      cancelFilter();
    }
  };

  $: if (domEditor) domEditor.value = value;
</script>

<div class="m-1">
  <div class="space-between">
    <div>
      <FontIcon icon="img primary-key" />
      <ColumnLabel {...baseTable.columns.find(x => x.columnName == column.columnName)} />
    </div>
    {#if formDisplay.config.formViewKeyRequested}
      <InlineButton square on:click={cancelFilter}>
        <FontIcon icon="icon delete" />
      </InlineButton>
    {/if}
  </div>
  <div class="flex">
    <input bind:this={domEditor} type="text" on:blur={applyFilter} on:keydown={handleKeyDown} />
  </div>
</div>
