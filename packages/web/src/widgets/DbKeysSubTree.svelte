<script lang="ts">
  import _ from 'lodash';

  import AppObjectCore from '../appobj/AppObjectCore.svelte';

  import DbKeysTreeNode from './DbKeysTreeNode.svelte';
  import {
    DB_KEYS_SHOW_INCREMENT,
    dbKeys_showNextItems,
    DbKeysChangeModelFunction,
    DbKeysTreeModel,
  } from 'dbgate-tools';

  export let key;
  export let connection;
  export let database;
  export let conid;
  export let indentLevel = 0;

  export let filter;

  export let model: DbKeysTreeModel;
  export let changeModel: DbKeysChangeModelFunction;

  export let parentRoots = [];

  $: items = model.childrenByKey[key] ?? [];
  $: visibleCount = model.dirStateByKey[key]?.visibleCount ?? DB_KEYS_SHOW_INCREMENT;
</script>

{#each items.slice(0, visibleCount) as item}
  <DbKeysTreeNode
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
      changeModel(model => dbKeys_showNextItems(model, key), false);
    }}
  />
{/if}
