<script context="module">
  export const extractKey = data => data._id;
  export const createMatcher =
    (filter, cfg = DEFAULT_CONNECTION_SEARCH_SETTINGS) =>
    props => {
      const { _id, displayName, server, user, engine } = props;
      const databases = getLocalStorage(`database_list_${_id}`) || [];
      const match = (engine || '').match(/^([^@]*)@/);
      const engineDisplay = match ? match[1] : engine;

      return filterNameCompoud(
        filter,
        [
          cfg.displayName ? displayName : null,
          cfg.server ? server : null,
          cfg.user ? user : null,
          cfg.engine ? engineDisplay : null,
        ],
        cfg.database ? databases.map(x => x.name) : []
      );
    };
  export function openConnection(connection, disableExpand = false) {
    if (connection.singleDatabase) {
      if (getOpenedSingleDatabaseConnections().includes(connection._id)) {
        return;
      }
    } else {
      if (getOpenedConnections().includes(connection._id)) {
        return;
      }
    }

    const config = getCurrentConfig();
    if (connection.singleDatabase) {
      switchCurrentDatabase({ connection, name: connection.defaultDatabase });
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

      if (!disableExpand) {
        expandedConnections.update(x => _.uniq([...x, connection._id]));
      }

      if (connection.defaultDatabase) {
        switchCurrentDatabase({ connection, name: connection.defaultDatabase });
      }

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
          message: _t('connection.closeConfirm', {
            defaultMessage: 'Closing connection will close {count} opened tabs, continue?',
            values: { count },
          }),
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
      switchCurrentDatabase(null);
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
    DEFAULT_CONNECTION_SEARCH_SETTINGS,
    expandedConnections,
    extensions,
    focusedConnectionOrDatabase,
    getCurrentConfig,
    getCurrentDatabase,
    getCurrentSettings,
    getOpenedConnections,
    getOpenedSingleDatabaseConnections,
    getOpenedTabs,
    openedConnections,
    openedSingleDatabaseConnections,
  } from '../stores';
  import { filterName, filterNameCompoud } from 'dbgate-tools';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import openNewTab from '../utility/openNewTab';
  import { getDatabaseMenuItems } from './DatabaseAppObject.svelte';
  import getElectron from '../utility/getElectron';
  import { getDatabaseList, useUsedApps } from '../utility/metadataLoaders';
  import { getLocalStorage } from '../utility/storageCache';
  import { apiCall, removeVolatileMapping } from '../utility/api';
  import { closeMultipleTabs } from '../tabpanel/TabsPanel.svelte';
  import AboutModal from '../modals/AboutModal.svelte';
  import { tick } from 'svelte';
  import { getConnectionLabel } from 'dbgate-tools';
  import hasPermission from '../utility/hasPermission';
  import { switchCurrentDatabase } from '../utility/common';
  import { getConnectionClickActionSetting } from '../settings/settingsTools';
  import { _t } from '../translations';
  import { isProApp } from '../utility/proTools';

  export let data;
  export let passProps;

  let statusIcon = null;
  let statusTitle = null;
  let extInfo = null;
  let engineStatusIcon = null;
  let engineStatusTitle = null;

  const electron = getElectron();

  const handleConnect = (disableExpand = false) => {
    openConnection(data, disableExpand);
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

  const handleDoubleClick = async () => {
    // const config = getCurrentConfig();
    // if (config.runAsPortal) {
    //   await tick();
    //   handleConnect(true);
    //   return;
    // }

    if ($openedSingleDatabaseConnections.includes(data._id)) {
      switchCurrentDatabase({ connection: data, name: data.defaultDatabase });
      return;
    }
    if ($openedConnections.includes(data._id)) {
      return;
    }
    await tick();
    handleConnect(true);

    // if (getCurrentSettings()['defaultAction.connectionClick'] == 'openDetails') {
    //   handleOpenConnectionTab();
    // } else {
    //   await tick();
    //   handleConnect();
    // }
  };

  const handleClick = async e => {
    // focusedConnectionOrDatabase.set({
    //   conid: data?._id,
    //   connection: data,
    //   database: data.singleDatabase ? data.defaultDatabase : null,
    // });

    const config = getCurrentConfig();

    const connectionClickAction = getConnectionClickActionSetting();
    if (connectionClickAction == 'openDetails') {
      if (config.runAsPortal == false && !config.storageDatabase) {
        openNewTab({
          title: getConnectionLabel(data),
          icon: 'img connection',
          tabComponent: 'ConnectionTab',
          tabPreviewMode: true,
          props: {
            conid: data._id,
          },
        });
      }
    }
    if (connectionClickAction == 'connect') {
      await tick();
      handleConnect();
    }
  };

  const handleMouseDown = () => {
    focusedConnectionOrDatabase.set({
      conid: data?._id,
      connection: data,
      database: data.singleDatabase ? data.defaultDatabase : null,
    });
  };

  const handleRestoreDatabase = () => {
    openNewTab({
      title: 'Restore #',
      icon: 'img db-restore',
      tabComponent: 'RestoreDatabaseTab',
      props: {
        conid: data._id,
      },
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
        message: _t('connection.deleteConfirm', {
          defaultMessage: 'Really delete connection {name}?',
          values: { name: getConnectionLabel(data) },
        }),
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
        header: _t('connection.createDatabase', { defaultMessage: 'Create database' }),
        value: 'newdb',
        label: _t('connection.databaseName', { defaultMessage: 'Database name' }),
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
        focused: true,
        props: {
          conid: data._id,
        },
      });
    };

    return [
      !data.singleDatabase && [
        !$openedConnections.includes(data._id) && {
          text: _t('connection.connect', { defaultMessage: 'Connect' }),
          onClick: handleConnect,
          isBold: true,
        },
        $openedConnections.includes(data._id) && {
          text: _t('connection.disconnect', { defaultMessage: 'Disconnect' }),
          onClick: handleDisconnect,
        },
      ],
      { divider: true },
      config.runAsPortal == false &&
        !config.storageDatabase && [
          {
            text: $openedConnections.includes(data._id)
              ? _t('connection.viewDetails', { defaultMessage: 'View details' })
              : _t('connection.edit', { defaultMessage: 'Edit' }),
            onClick: handleOpenConnectionTab,
          },
          !$openedConnections.includes(data._id) && {
            text: _t('connection.delete', { defaultMessage: 'Delete' }),
            onClick: handleDelete,
          },
          {
            text: _t('connection.duplicate', { defaultMessage: 'Duplicate' }),
            onClick: handleDuplicate,
          },
        ],
      { divider: true },
      !data.singleDatabase && [
        hasPermission(`dbops/query`) && {
          onClick: handleNewQuery,
          text: _t('connection.newQuery', { defaultMessage: 'New Query (server)' }),
          isNewQuery: true,
        },
        $openedConnections.includes(data._id) &&
          data.status && {
            text: _t('connection.refresh', { defaultMessage: 'Refresh' }),
            onClick: handleRefresh,
          },
        hasPermission(`dbops/createdb`) &&
          $openedConnections.includes(data._id) &&
          driver?.supportedCreateDatabase &&
          !data.isReadOnly && {
            text: _t('connection.createDatabase', { defaultMessage: 'Create database' }),
            onClick: handleCreateDatabase,
          },
        driver?.supportsServerSummary && {
          text: _t('connection.serverSummary', { defaultMessage: 'Server summary' }),
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

      driver?.supportsDatabaseRestore &&
        isProApp() &&
        hasPermission(`dbops/sql-dump/import`) &&
        !data.isReadOnly && { onClick: handleRestoreDatabase, text: 'Restore database backup' },
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
      engineStatusTitle = _t('connection.engineDriverNotFound', {
        defaultMessage:
          'Engine driver {engine} not found, review installed plugins and change engine in edit connection dialog',
        values: { engine: data.engine },
      });
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
    ? $currentDatabase?.connection?._id == data._id && $currentDatabase?.name == data.defaultDatabase
    : $currentDatabase?.connection?._id == data._id}
  statusIcon={statusIcon || engineStatusIcon}
  statusTitle={statusTitle || engineStatusTitle}
  statusTitleToCopy={statusTitle || engineStatusTitle}
  statusIconBefore={data.isReadOnly ? 'icon lock' : null}
  {extInfo}
  colorMark={passProps?.connectionColorFactory && passProps?.connectionColorFactory({ conid: data._id })}
  menu={getContextMenu}
  on:click={handleClick}
  on:mousedown={handleMouseDown}
  on:dblclick
  on:expand
  on:dblclick={handleDoubleClick}
  on:middleclick={() => {
    _.flattenDeep(getContextMenu())
      .find(x => x.isNewQuery)
      .onClick();
  }}
  isChoosed={data._id == $focusedConnectionOrDatabase?.conid &&
    (data.singleDatabase
      ? $focusedConnectionOrDatabase?.database == data.defaultDatabase
      : !$focusedConnectionOrDatabase?.database)}
  disableBoldScroll={!!$focusedConnectionOrDatabase}
/>
