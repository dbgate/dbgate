<script context="module">
  export const extractKey = data => data._id;
  export const createMatcher = ({ displayName, server }) => filter => filterName(filter, displayName, server);
</script>

<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import { currentDatabase, extensions, getCurrentConfig, openedConnections } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import { filterName } from 'dbgate-datalib';
  import { showModal } from '../modals/modalTools';
  import ConnectionModal from '../modals/ConnectionModal.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import openNewTab from '../utility/openNewTab';
  import { getDatabaseMenuItems } from './DatabaseAppObject.svelte';
  import getElectron from '../utility/getElectron';

  export let data;

  let statusIcon = null;
  let statusTitle = null;
  let extInfo = null;
  let engineStatusIcon = null;
  let engineStatusTitle = null;

  const electron = getElectron();

  const handleConnect = () => {
    if (data.singleDatabase) {
      $currentDatabase = { connection: data, name: data.defaultDatabase };
      axiosInstance.post('database-connections/refresh', {
        conid: data._id,
        database: data.defaultDatabase,
        keepOpen: true,
      });
    } else {
      $openedConnections = _.uniq([...$openedConnections, data._id]);
      axiosInstance.post('server-connections/refresh', {
        conid: data._id,
        keepOpen: true,
      });
    }
  };

  const getContextMenu = () => {
    const config = getCurrentConfig();
    const handleRefresh = () => {
      axiosInstance.post('server-connections/refresh', { conid: data._id });
    };
    const handleDisconnect = () => {
      openedConnections.update(list => list.filter(x => x != data._id));
      if (electron) {
        axiosInstance.post('server-connections/disconnect', { conid: data._id });
      }
      if (_.get($currentDatabase, 'connection._id') == data._id) {
        if (electron) {
          axiosInstance.post('database-connections/disconnect', { conid: data._id, database: $currentDatabase.name });
        }
        currentDatabase.set(null);
      }
    };
    const handleEdit = () => {
      showModal(ConnectionModal, { connection: data });
    };
    const handleDelete = () => {
      showModal(ConfirmModal, {
        message: `Really delete connection ${data.displayName || data.server}?`,
        onConfirm: () => axiosInstance.post('connections/delete', data),
      });
    };
    const handleDuplicate = () => {
      axiosInstance.post('connections/save', {
        ...data,
        _id: undefined,
        displayName: `${data.displayName || data.server} - copy`,
      });
    };
    const handleCreateDatabase = () => {
      showModal(InputTextModal, {
        header: 'Create database',
        value: 'newdb',
        label: 'Database name',
        onConfirm: name =>
          axiosInstance.post('server-connections/create-database', {
            conid: data._id,
            name,
          }),
      });
    };
    const handleNewQuery = () => {
      const tooltip = `${data.displayName || data.server}`;
      openNewTab({
        title: 'Query #',
        icon: 'img sql-file',
        tooltip,
        tabComponent: 'QueryTab',
        props: {
          conid: data._id,
        },
      });
    };

    return [
      config.runAsPortal == false && [
        {
          text: 'Edit',
          onClick: handleEdit,
        },
        {
          text: 'Delete',
          onClick: handleDelete,
        },
        {
          text: 'Duplicate',
          onClick: handleDuplicate,
        },
      ],
      !data.singleDatabase && [
        !$openedConnections.includes(data._id) && {
          text: 'Connect',
          onClick: handleConnect,
        },
        { onClick: handleNewQuery, text: 'New query' },
        $openedConnections.includes(data._id) &&
          data.status && {
            text: 'Refresh',
            onClick: handleRefresh,
          },
        $openedConnections.includes(data._id) && {
          text: 'Disconnect',
          onClick: handleDisconnect,
        },
        $openedConnections.includes(data._id) && {
          text: 'Create database',
          onClick: handleCreateDatabase,
        },
      ],
      data.singleDatabase && [
        { divider: true },
        getDatabaseMenuItems(data, data.defaultDatabase, $extensions, $currentDatabase),
      ],
    ];
  };

  $: {
    if ($extensions.drivers.find(x => x.engine == data.engine)) {
      const match = (data.engine || '').match(/^([^@]*)@/);
      extInfo = match ? match[1] : data.engine;
      engineStatusIcon = null;
      engineStatusTitle = null;
    } else {
      extInfo = data.engine;
      engineStatusIcon = 'img warn';
      engineStatusTitle = `Engine driver ${data.engine} not found, review installed plugins and change engine in edit connection dialog`;
    }
  }

  $: {
    const { _id, status } = data;
    if ($openedConnections.includes(_id)) {
      if (!status) statusIcon = 'icon loading';
      else if (status.name == 'pending') statusIcon = 'icon loading';
      else if (status.name == 'ok') statusIcon = 'img ok';
      else statusIcon = 'img error';
      if (status && status.name == 'error') {
        statusTitle = status.message;
      }
    } else {
      statusIcon = null;
      statusTitle = null;
    }
  }

  // const handleEdit = () => {
  //   showModal(modalState => <ConnectionModal modalState={modalState} connection={data} />);
  // };
  // const handleDelete = () => {
  //   showModal(modalState => (
  //     <ConfirmModal
  //       modalState={modalState}
  //       message={`Really delete connection ${data.displayName || data.server}?`}
  //       onConfirm={() => axios.post('connections/delete', data)}
  //     />
  //   ));
  // };
  // const handleCreateDatabase = () => {
  //   showModal(modalState => <CreateDatabaseModal modalState={modalState} conid={data._id} />);
  // };
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.singleDatabase
    ? data.displayName || `${data.defaultDatabase} on ${data.server}`
    : data.displayName || data.server}
  icon={data.singleDatabase ? 'img database' : 'img server'}
  isBold={data.singleDatabase
    ? _.get($currentDatabase, 'connection._id') == data._id && _.get($currentDatabase, 'name') == data.defaultDatabase
    : _.get($currentDatabase, 'connection._id') == data._id}
  statusIcon={statusIcon || engineStatusIcon}
  statusTitle={statusTitle || engineStatusTitle}
  {extInfo}
  menu={getContextMenu}
  on:click={handleConnect}
  on:click
/>
