<script lang="ts">
  import { writable } from 'svelte/store';
  import { DatabaseProcess } from 'dbgate-types';
  import TableControl from '../elements/TableControl.svelte';
  import { _t } from '../translations';
  import CtaButton from '../buttons/CtaButton.svelte';
  import { apiCall } from '../utility/api';
  import { onMount } from 'svelte';
  import { showSnackbarError, showSnackbarSuccess } from '../utility/snackbar';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';

  export let conid;
  export let isSummaryOpened: boolean = false;
  export let processes: DatabaseProcess[] = [];
  export let refreshInterval: number = 1000;
  export let tabVisible: boolean = false;

  const filters = writable({});

  let internalProcesses = [...processes];

  async function refreshProcesses() {
    const data = await apiCall('server-connections/list-database-processes', { conid });
    internalProcesses = data.result;
  }

  async function killProcess(processId: number) {
    const result = await apiCall('server-connections/kill-database-process', {
      pid: processId,
      conid,
    });

    if (result.errorMessage || result.error) {
      showSnackbarError(
        _t('summaryProcesses.killError', {
          defaultMessage: 'Error while killing process {processId}: {errorMessage}',
          values: { processId, errorMessage: result.errorMessage || result.error },
        })
      );
    } else {
      showSnackbarSuccess(
        _t('summaryProcesses.killSuccess', {
          defaultMessage: 'Process {processId} killed successfully',
          values: { processId },
        })
      );
    }

    refreshProcesses();
  }

  async function killProcessWithConfirm(processId: number) {
    showModal(ConfirmModal, {
      message: _t('summaryProcesses.killConfirm', {
        defaultMessage: 'Are you sure you want to kill process {processId}?',
        values: { processId },
      }),
      onConfirm: async () => {
        await killProcess(processId);
      },
    });
  }

  function formatRunningTime(seconds: number): string {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds.toFixed(3)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(3)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  onMount(() => {
    const intervalId = setInterval(() => {
      if (!tabVisible || !isSummaryOpened) return;

      refreshProcesses();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  });
</script>

<div>
  <TableControl
    {filters}
    stickyHeader
    rows={internalProcesses}
    columns={[
      {
        sortable: true,
        filterable: true,
        header: _t('summaryProcesses.processId', { defaultMessage: 'Process ID' }),
        fieldName: 'processId',
        slot: 1,
      },
      {
        sortable: true,
        filterable: true,
        header: _t('summaryProcesses.connectionId', { defaultMessage: 'Connection ID' }),
        fieldName: 'connectionId',
      },
      {
        sortable: true,
        filterable: true,
        header: _t('summaryProcesses.client', { defaultMessage: 'Client' }),
        fieldName: 'client',
      },
      {
        filterable: true,
        header: _t('summaryProcesses.operation', { defaultMessage: 'Operation' }),
        fieldName: 'operation',
      },
      {
        sortable: true,
        filterable: true,
        header: _t('summaryProcesses.namespace', { defaultMessage: 'Namespace' }),
        fieldName: 'namespace',
      },
      {
        sortable: true,
        header: _t('summaryProcesses.runningTime', { defaultMessage: 'Running Time' }),
        fieldName: 'runningTime',
        slot: 2,
      },
      {
        sortable: true,
        filterable: true,
        header: _t('summaryProcesses.state', { defaultMessage: 'State' }),
        fieldName: 'state',
      },
      {
        sortable: true,
        header: _t('summaryProcesses.waitingFor', { defaultMessage: 'Waiting For' }),
        fieldName: 'waitingFor',
        slot: 3,
      },
      {
        header: _t('summaryProcesses.actions', { defaultMessage: 'Actions' }),
        fieldName: 'processId',
        slot: 0,
      },
    ]}
  >
    <svelte:fragment slot="0" let:row>
      <CtaButton on:click={() => killProcessWithConfirm(row.processId)}>
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
