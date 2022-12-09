<script>
  import Link from '../elements/Link.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import ObjectListControl from '../elements/ObjectListControl.svelte';
  import { apiCall } from '../utility/api';
  import formatFileSize from '../utility/formatFileSize';
  import openNewTab from '../utility/openNewTab';

  export let conid;

  let refreshToken = 0;

  async function runAction(action, row) {
    const { command, openQuery } = action;
    if (command) {
      await apiCall('server-connections/summary-command', { conid, refreshToken, command, row });
      refreshToken += 1;
    }
    if (openQuery) {
      openNewTab({
        title: action.tabTitle || row.name,
        icon: 'img query-data',
        tabComponent: 'QueryDataTab',
        props: {
          conid,
          database: row.name,
          sql: openQuery,
        },
      });
    }
  }
</script>

{#await apiCall('server-connections/server-summary', { conid, refreshToken })}
  <LoadingInfo message="Loading server details" wrapper />
{:then summary}
  <div class="wrapper">
    <ObjectListControl
      collection={summary.databases}
      hideDisplayName
      title={`Databases (${summary.databases.length})`}
      emptyMessage={'No databases'}
      columns={summary.columns.map(col => ({
        ...col,
        slot: col.columnType == 'bytes' ? 1 : col.columnType == 'actions' ? 2 : null,
      }))}
    >
      <svelte:fragment slot="1" let:row let:col>{formatFileSize(row?.[col.fieldName])}</svelte:fragment>
      <svelte:fragment slot="2" let:row let:col>
        {#each col.actions as action, index}
          {#if index > 0}
            <span> | </span>
          {/if}
          <Link onClick={() => runAction(action, row)}>{action.header}</Link>
        {/each}
      </svelte:fragment>
    </ObjectListControl>
  </div>
{/await}

<style>
  .wrapper {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background-color: var(--theme-bg-0);
    overflow: auto;
  }
</style>
