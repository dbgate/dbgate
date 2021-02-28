<script context="module">
  const getContextMenu = (data, $openedConnections) => () => {
    const handleRefresh = () => {
      axios.post('server-connections/refresh', { conid: data._id });
    };
    const handleDisconnect = () => {
      openedConnections.update(list => list.filter(x => x != data._id));
    };
    const handleConnect = () => {
      openedConnections.update(list => _.uniq([...list, data._id]));
    };

    return [
      !$openedConnections.includes(data._id) && {
        text: 'Connect',
        onClick: handleConnect,
      },
      $openedConnections.includes(data._id) &&
        data.status && {
          text: 'Refresh',
          onClick: handleRefresh,
        },
      $openedConnections.includes(data._id) && {
        text: 'Disconnect',
        onClick: handleDisconnect,
      },
    ];
  };

  export const extractKey = data => data._id;
  export const createMatcher = ({ displayName, server }) => filter => filterName(filter, displayName, server);
</script>

<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import { currentDatabase, extensions, openedConnections } from '../stores';
  import axios from '../utility/axios';
  import { filterName } from 'dbgate-datalib';

  export let commonProps;
  export let data;

  let statusIcon = null;
  let statusTitle = null;
  let extInfo = null;
  let engineStatusIcon = null;
  let engineStatusTitle = null;

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
  {...commonProps}
  title={data.displayName || data.server}
  icon="img server"
  isBold={_.get($currentDatabase, 'connection._id') == data._id}
  statusIcon={statusIcon || engineStatusIcon}
  statusTitle={statusTitle || engineStatusTitle}
  {extInfo}
  menu={getContextMenu(data, $openedConnections)}
  on:click
  on:click={() => ($openedConnections = _.uniq([...$openedConnections, data._id]))}
/>
