<script lang="ts" context="module">
  import { cloudConnectionsStore } from '../stores';
  import { apiCall } from '../utility/api';
  import AppObjectCore from './AppObjectCore.svelte';

  export const extractKey = data => data.cntid;
  export const createMatcher =
    filter =>
    ({ name }) =>
      filterName(filter, name);
</script>

<script lang="ts">
  import { filterName, getConnectionLabel } from 'dbgate-tools';
  import ConnectionAppObject, { openConnection } from './ConnectionAppObject.svelte';
  import { _t } from '../translations';
  import openNewTab from '../utility/openNewTab';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import SavedFileAppObject from './SavedFileAppObject.svelte';

  export let data;
  export let passProps;

  function createMenu() {
    const res = [];
    switch (data.type) {
      case 'connection':
        res.push({
          text: _t('connection.connect', { defaultMessage: 'Connect' }),
          onClick: handleConnect,
          isBold: true,
        });
        res.push({ divider: true });
        res.push({
          text: _t('connection.edit', { defaultMessage: 'Edit' }),
          onClick: handleEditConnection,
        });
        res.push({
          text: _t('connection.delete', { defaultMessage: 'Delete' }),
          onClick: handleDeleteConnection,
        });
        res.push({
          text: _t('connection.duplicate', { defaultMessage: 'Duplicate' }),
          onClick: handleDuplicateConnection,
        });
        break;
    }

    return res;
  }

  function handleEditConnection() {
    openNewTab({
      title: data.name,
      icon: 'img cloud-connection',
      tabComponent: 'ConnectionTab',
      props: {
        conid: data.conid,
      },
    });
  }

  async function handleDeleteConnection() {
    showModal(ConfirmModal, {
      message: `Really delete connection ${data.name}?`,
      onConfirm: () => {
        apiCall('cloud/delete-connection', { conid: data.conid });
      },
    });
  }

  async function handleDuplicateConnection() {
    await apiCall('cloud/duplicate-connection', { conid: data.conid });
  }

  async function handleConnect() {
    const conn = await apiCall('connections/get', { conid: data.conid });
    $cloudConnectionsStore = {
      ...$cloudConnectionsStore,
      [data.conid]: conn,
    };
    openConnection(conn);
  }

  async function handleOpenContent() {
    switch (data.type) {
      case 'connection':
        await handleConnect();
        break;
    }
  }
</script>

{#if data.conid && $cloudConnectionsStore[data.conid] && $cloudConnectionsStore[data.conid]?._id}
  <ConnectionAppObject
    {...$$restProps}
    {passProps}
    data={{
      ...$cloudConnectionsStore[data.conid],
      status: data.status,
    }}
    on:dblclick
    on:expand
  />
{:else if data.type == 'file'}
  <SavedFileAppObject
    {...$$restProps}
    {passProps}
    data={{
      file: data.name,
      folder: data.contentAttributes?.contentFolder,
      folid: data.folid,
      cntid: data.cntid,
    }}
    on:dblclick
    on:expand
  />
{:else}
  <AppObjectCore
    {...$$restProps}
    {data}
    icon={'img cloud-connection'}
    title={data.name}
    menu={createMenu}
    colorMark={passProps?.cloudContentColorFactory &&
      passProps?.cloudContentColorFactory({ cntid: data.cntid, folid: data.folid })}
    on:click={handleOpenContent}
    on:dblclick
    on:expand
  ></AppObjectCore>
{/if}

<style>
  .info {
    margin-left: 30px;
    margin-right: 5px;
    color: var(--theme-font-3);
    white-space: nowrap;
  }
</style>
