<script lang="ts">
  import _ from 'lodash';
  import DbKeyValueDetail from './DbKeyValueDetail.svelte';

  export let dbKeyFields;
  export let item;
  export let onChangeItem = null;
</script>

<div class="props">
  {#each dbKeyFields as column}
    <DbKeyValueDetail
      value={item && item[column.name]}
      columnTitle={_.startCase(column.name)}
      onChangeValue={onChangeItem
        ? value => {
            onChangeItem?.({
              ...item,
              [column.name]: value,
            });
          }
        : null}
    />
  {/each}
</div>

<style>
  .props {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
