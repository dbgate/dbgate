<script context="module">
  export const extractKey = data => data._id;
  export const createMatcher = props => filter => {
    const { _id, displayName, server } = props;
    const databases = getLocalStorage(`database_list_${_id}`) || [];
    return filterName(filter, displayName, server, ...databases.map(x => x.name));
  };
  export const createChildMatcher = props => filter => {
    if (!filter) return false;
    const { _id } = props;
    const databases = getLocalStorage(`database_list_${_id}`) || [];
    return filterName(filter, ...databases.map(x => x.name));
  };
  export function openConnection(connection) {
    const config = getCurrentConfig();
    if (connection.singleDatabase) {
      currentDatabase.set({ connection, name: connection.defaultDatabase });
      apiCall('database-connections/refresh', {
        conid: connection._id,
        database: connection.defaultDatabase,
        keepOpen: true,
      });
      openedSingleDatabaseConnections.update(x => _.uniq([...x, connection._id]));
    } else {
      openedConnections.update(x => _.uniq([...x, connection._id]));
      apiCall('server-connections/refresh', {
        conid: connection._id,
        keepOpen: true,
      });
      expandedConnections.update(x => _.uniq([...x, connection._id]));

      // if (!config.runAsPortal && getCurrentSettings()['defaultAction.connectionClick'] != 'connect') {
      //   expandedConnections.update(x => _.uniq([...x, connection._id]));
      // }
    }
    // closeMultipleTabs(x => x.tabComponent == 'ConnectionTab' && x.props?.conid == connection._id, true);
  }
  export function disconnectServerConnection(conid, showConfirmation = true) {
    const closeCondition = x => x.props?.conid == conid && x.tabComponent != 'ConnectionTab' && x.closedTime == null;

    if (showConfirmation) {
      const count = getOpenedTabs().filter(closeCondition).length;
      if (count > 0) {
        showModal(ConfirmModal, {
          message: `Closing connection will close ${count} opened tabs, continue?`,
          onConfirm: () => disconnectServerConnection(conid, false),
        });
        return;
      }
    }

    const electron = getElectron();
    const currentDb = getCurrentDatabase();
    openedConnections.update(list => list.filter(x => x != conid));
    removeVolatileMapping(conid);
    if (electron) {
      apiCall('server-connections/disconnect', { conid });
    }
    if (currentDb?.connection?._id == conid) {
      if (electron) {
        apiCall('database-connections/disconnect', { conid, database: currentDb.name });
      }
      currentDatabase.set(null);
    }
    closeMultipleTabs(closeCondition);
    // if (data.unsaved) {
    //   openNewTab({
    //     title: 'New Connection',
    //     icon: 'img connection',
    //     tabComponent: 'ConnectionTab',
    //     props: {
    //       conid: data._id,
    //     },
    //   });
    // }
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import {
    currentDatabase,
    expandedConnections,
    extensions,
    getCurrentConfig,
    getCurrentDatabase,
    getCurrentSettings,
    getOpenedConnections,
    getOpenedTabs,
    openedConnections,
    openedSingleDatabaseConnections,
  } from '../stores';
  import { filterName } from 'dbgate-tools';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import openNewTab from '../utility/openNewTab';
  import { getDatabaseMenuItems } from './DatabaseAppObject.svelte';
  import getElectron from '../utility/getElectron';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { getDatabaseList, useUsedApps } from '../utility/metadataLoaders';
  import { getLocalStorage } from '../utility/storageCache';
  import { apiCall, removeVolatileMapping } from '../utility/api';
  import ImportDatabaseDumpModal from '../modals/ImportDatabaseDumpModal.svelte';
  import { closeMultipleTabs } from '../widgets/TabsPanel.svelte';
  import AboutModal from '../modals/AboutModal.svelte';
  import { tick } from 'svelte';

  export let data;
  export let passProps;

  let statusIcon = null;
  let statusTitle = null;
  let extInfo = null;
  let engineStatusIcon = null;
  let engineStatusTitle = null;

  const electron = getElectron();

  const handleConnect = () => {
    openConnection(data);
  };

  const handleOpenConnectionTab = () => {
    openNewTab({
      title: getConnectionLabel(data),
      icon: 'img connection',
      tabComponent: 'ConnectionTab',
      props: {
        conid: data._id,
      },
    });
  };

  const handleClick = async () => {
    const config = getCurrentConfig();
    if (config.runAsPortal) {
      await tick();
      handleConnect();
      return;
    }
    if ($openedSingleDatabaseConnections.includes(data._id)) {
      currentDatabase.set({ connection: data, name: data.defaultDatabase });
      return;
    }
    if ($openedConnections.includes(data._id)) {
      return;
    }

    if (getCurrentSettings()['defaultAction.connectionClick'] == 'openDetails') {
      handleOpenConnectionTab();
    } else {
      await tick();
      handleConnect();
    }
  };

  const handleSqlRestore = () => {
    showModal(ImportDatabaseDumpModal, {
      connection: data,
    });
  };

  const getContextMenu = () => {
    const driver = $extensions.drivers.find(x => x.engine == data.engine);
    const config = getCurrentConfig();
    const handleRefresh = () => {
      apiCall('server-connections/refresh', { conid: data._id });
    };
    const handleDisconnect = () => {
      disconnectServerConnection(data._id);
    };
    const handleDelete = () => {
      showModal(ConfirmModal, {
        message: `Really delete connection ${getConnectionLabel(data)}?`,
        onConfirm: () => apiCall('connections/delete', data),
      });
    };
    const handleDuplicate = () => {
      apiCall('connections/save', {
        ...data,
        _id: undefined,
        displayName: `${getConnectionLabel(data)} - copy`,
      });
    };
    const handleCreateDatabase = () => {
      showModal(InputTextModal, {
        header: 'Create database',
        value: 'newdb',
        label: 'Database name',
        onConfirm: name =>
          apiCall('server-connections/create-database', {
            conid: data._id,
            name,
          }),
      });
    };
    const handleServerSummary = () => {
      openNewTab({
        title: getConnectionLabel(data),
        icon: 'img server',
        tabComponent: 'ServerSummaryTab',
        props: {
          conid: data._id,
        },
      });
    };
    const handleNewQuery = () => {
      const tooltip = `${getConnectionLabel(data)}`;
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
          text: $openedConnections.includes(data._id) ? 'View details' : 'Edit',
          onClick: handleOpenConnectionTab,
        },
        !$openedConnections.includes(data._id) && {
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
        { onClick: handleNewQuery, text: 'New query', isNewQuery: true },
        $openedConnections.includes(data._id) &&
          data.status && {
            text: 'Refresh',
            onClick: handleRefresh,
          },
        $openedConnections.includes(data._id) && {
          text: 'Disconnect',
          onClick: handleDisconnect,
        },
        $openedConnections.includes(data._id) &&
          driver?.supportedCreateDatabase &&
          !data.isReadOnly && {
            text: 'Create database',
            onClick: handleCreateDatabase,
          },
        driver?.supportsServerSummary && {
          text: 'Server summary',
          onClick: handleServerSummary,
        },
      ],
      data.singleDatabase && [
        { divider: true },
        getDatabaseMenuItems(
          data,
          data.defaultDatabase,
          $extensions,
          $currentDatabase,
          $apps,
          $openedSingleDatabaseConnections
        ),
      ],

      driver?.databaseEngineTypes?.includes('sql') && { onClick: handleSqlRestore, text: 'Restore/import SQL dump' },
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

  $: apps = useUsedApps();
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={getConnectionLabel(data, { showUnsaved: true })}
  icon={data.singleDatabase ? 'img database' : 'img server'}
  isBold={data.singleDatabase
    ? _.get($currentDatabase, 'connection._id') == data._id && _.get($currentDatabase, 'name') == data.defaultDatabase
    : _.get($currentDatabase, 'connection._id') == data._id}
  statusIcon={statusIcon || engineStatusIcon}
  statusTitle={statusTitle || engineStatusTitle}
  statusIconBefore={data.isReadOnly ? 'icon lock' : null}
  {extInfo}
  colorMark={passProps?.connectionColorFactory && passProps?.connectionColorFactory({ conid: data._id })}
  menu={getContextMenu}
  on:click={handleClick}
  on:click
  on:expand
  on:dblclick={handleConnect}
  on:middleclick={() => {
    _.flattenDeep(getContextMenu())
      .find(x => x.isNewQuery)
      .onClick();
  }}
/>
