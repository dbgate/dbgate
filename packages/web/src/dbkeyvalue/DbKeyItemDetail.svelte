<script lang="ts">
  import AceEditor from '../query/AceEditor.svelte';

  export let keyInfo;
  export let item;
  export let onChangeItem;
</script>

<div class="props">
  {#each keyInfo.tableColumns as column}
    <div class="colname">{column.name}</div>
    <div class="colvalue">
      <AceEditor
        readOnly={!onChangeItem}
        value={item && item[column.name]}
        on:input={e => {
          if (onChangeItem) {
            onChangeItem({
              ...item,
              [column.name]: e.detail,
            });
          }
        }}
      />
    </div>
  {/each}
</div>

<style>
  .props {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .colname {
    margin: 10px;
  }

  .colvalue {
    position: relative;
    flex: 1;
  }
</style>
