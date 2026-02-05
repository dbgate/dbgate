<script lang="ts">
  import _ from 'lodash';

  import AppObjectCore from '../appobj/AppObjectCore.svelte';

  import RedisKeysTreeNode from './RedisKeysTreeNode.svelte';
  import {
    DB_KEYS_SHOW_INCREMENT,
    redis_showNextItems,
    RedisChangeModelFunction,
    RedisTreeModel,
  } from 'dbgate-tools';

  export let key;
  export let connection;
  export let database;
  export let conid;
  export let indentLevel = 0;

  export let filter;

  export let model: RedisTreeModel;
  export let changeModel: RedisChangeModelFunction;

  export let parentRoots = [];

  $: items = model.childrenByKey[key] ?? [];
  $: visibleCount = model.dirStateByKey[key]?.visibleCount ?? DB_KEYS_SHOW_INCREMENT;
</script>

{#each items.slice(0, visibleCount) as item}
  <RedisKeysTreeNode
    {conid}
    {database}
    {key}
    {connection}
    {item}
    {filter}
    {indentLevel}
    {model}
    {changeModel}
    parentRoots={[...parentRoots, key]}
  />
{/each}

{#if model.childrenByKey[key]?.length > visibleCount}
  <AppObjectCore
    {indentLevel}
    title="Show more..."
    icon="icon dots-horizontal"
    expandIcon="icon invisible-box"
    on:click={() => {
      changeModel(model => redis_showNextItems(model, key), false);
    }}
  />
{/if}
