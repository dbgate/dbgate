<script lang="ts">
  import _ from 'lodash';

  import AceEditor from '../query/AceEditor.svelte';

  export let dbKeyFields;
  export let item;
  export let onChangeItem = null;
</script>

<div class="props">
  {#each dbKeyFields as column}
    <div class="colname">{_.startCase(column.name)}</div>
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
    margin-top: 20px;
    color: var(--theme-font-3);
  }

  .colvalue {
    position: relative;
    flex: 1;
  }
</style>
