<script lang="ts">
  import { DatabaseProcess } from 'dbgate-types';
  import TableControl from '../elements/TableControl.svelte';
  import { _t } from '../translations';
  import CtaButton from '../buttons/CtaButton.svelte';
  import { apiCall } from '../utility/api';
  import { onMount } from 'svelte';

  export let conid;
  export let processes: DatabaseProcess[] = [];
  export let refreshInterval: number = 1000;

  let internalProcesses = [...processes];

  async function refreshProcesses() {
    const data = await apiCall('server-connections/list-database-processes', { conid });
    internalProcesses = data.result;
  }

  async function killProcess(processId: number) {
    await apiCall('server-connections/kill-database-process', {
      pid: processId,
      conid,
    });

    refreshProcesses();
  }

  function formatRunningTime(seconds: number): string {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  onMount(() => {
    const intervalId = setInterval(() => refreshProcesses(), refreshInterval);

    return () => clearInterval(intervalId);
  });
</script>

<div>
  <TableControl
    rows={internalProcesses}
    columns={[
      { header: 'Process ID', fieldName: 'processId', slot: 1 },
      { header: 'Connection ID', fieldName: 'connectionId' },
      { header: 'Client', fieldName: 'client' },
      { header: 'Operation', fieldName: 'operation' },
      { header: 'Namespace', fieldName: 'namespace' },
      { header: 'Running Time', fieldName: 'runningTime', slot: 2 },
      { header: 'State', fieldName: 'state' },
      { header: 'Waiting For', fieldName: 'waitingFor', slot: 3 },
      {
        header: 'Actions',
        fieldName: 'processId',
        slot: 0,
      },
    ]}
  >
    <svelte:fragment slot="0" let:row>
      <CtaButton on:click={() => killProcess(row.processId)}>
        {_t('common.kill', { defaultMessage: 'Kill' })}
      </CtaButton>
    </svelte:fragment>

    <svelte:fragment slot="1" let:row>
      <code>{row.processId}</code>
    </svelte:fragment>

    <svelte:fragment slot="2" let:row>
      <span>{formatRunningTime(row.runningTime)}</span>
    </svelte:fragment>

    <svelte:fragment slot="3" let:row>
      <span class:waiting={row.waitingFor}>{row.waitingFor ? 'Yes' : 'No'}</span>
    </svelte:fragment>
  </TableControl>
</div>

<style>
  div {
    padding: 10px;
  }

  code {
    font-family: monospace;
    background: var(--theme-bg-1);
    padding: 2px 4px;
    border-radius: 3px;
  }

  .waiting {
    color: var(--theme-font-warning);
    font-weight: bold;
  }
</style>
