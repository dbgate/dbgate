<script lang="ts">
  import _ from 'lodash';

  import AppObjectCore from '../appobj/AppObjectCore.svelte';

  import DbKeysTreeNode from './DbKeysTreeNode.svelte';
  import { dbKeys_markNodeExpanded, DbKeysChangeModelFunction, DbKeysTreeModel } from 'dbgate-tools';

  export let root;
  export let connection;
  export let database;
  export let conid;
  export let indentLevel = 0;

  export let filter;

  export let model: DbKeysTreeModel;
  export let changeModel: DbKeysChangeModelFunction;

  $: items = model.childrenByKey[root] ?? [];
</script>

{#each items as item}
  <DbKeysTreeNode {conid} {database} {root} {connection} {item} {filter} {indentLevel} {model} {changeModel} />
{/each}

{#if model.dirsByKey[root]?.shouldLoadNext}
  <AppObjectCore {indentLevel} title="Loading keys..." icon="icon loading" expandIcon="icon invisible-box" />
{:else if model.dirsByKey[root]?.hasNext}
  <AppObjectCore
    {indentLevel}
    title="Show more..."
    icon="icon dots-horizontal"
    expandIcon="icon invisible-box"
    on:click={() => {
      changeModel(model => dbKeys_markNodeExpanded(model, root, true));
    }}
  />
{/if}
