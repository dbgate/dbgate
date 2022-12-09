<script>
  import Link from '../elements/Link.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import ObjectListControl from '../elements/ObjectListControl.svelte';
  import { apiCall } from '../utility/api';
  import formatFileSize from '../utility/formatFileSize';

  export let conid;

  let refreshToken = 0;

  async function callAction(command, row) {
    await apiCall('server-connections/summary-command', { conid, refreshToken, command, row });
    refreshToken += 1;
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
          <Link onClick={() => callAction(action.command, row)}>{action.header}</Link>
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
