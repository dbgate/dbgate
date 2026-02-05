<script lang="ts">
  import _ from 'lodash';
  import RedisValueDetail from './RedisValueDetail.svelte';

  export let dbKeyFields;
  export let item;
  export let onChangeItem = null;
</script>

<div class="props">
  {#each dbKeyFields as column}
    <RedisValueDetail
      value={item && item[column.name] != null ? String(item[column.name]) : ''}
      columnTitle={_.startCase(column.name)}
      onChangeValue={onChangeItem && !column.readOnly
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
    padding: 16px;
    gap: 16px;
    overflow: auto;
    background-color: var(--theme-redis-background);
    border-top: var(--theme-redis-border);
  }
</style>
