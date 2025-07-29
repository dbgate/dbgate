<script lang="ts" context="module">
  import { copyTextToClipboard } from '../utility/clipboard';

  export const extractKey = props => props.name;

  export const createMatcher = filter => props => {
    const { name, displayName, server } = props;
    return filterName(filter, name, displayName, server);
  };

  export function disconnectDatabaseConnection(conid, database, showConfirmation = true) {
    const closeCondition = x =>
      x.props?.conid == conid &&
      x.props?.database == database &&
      x.tabComponent != 'ConnectionTab' &&
      x.closedTime == null;

    if (showConfirmation) {
      const count = getOpenedTabs().filter(closeCondition).length;
      if (count > 0) {
        showModal(ConfirmModal, {
          message: _t('database.closeConfirm', {
            defaultMessage: 'Closing connection will close {count} opened tabs, continue?',
            values: { count },
          }),
          onConfirm: () => disconnectDatabaseConnection(conid, database, false),
        });
        return;
      }
    }

    const electron = getElectron();
    if (electron) {
      apiCall('database-connections/disconnect', { conid, database });
    }
    if (getCurrentDatabase()?.connection?._id == conid && getCurrentDatabase()?.name == database) {
      switchCurrentDatabase(null);
    }
    openedSingleDatabaseConnections.update(list => list.filter(x => x != conid));
    closeMultipleTabs(closeCondition);
  }

  export function getDatabaseMenuItems(
    connection,
    name,
    $extensions,
    $currentDatabase,
    $apps,
    $openedSingleDatabaseConnections
  ) {
    const apps = filterAppsForDatabase(connection, name, $apps);
    const handleNewQuery = () => {
      const tooltip = `${getConnectionLabel(connection)}\n${name}`;
      openNewTab({
        title: _t('database.newQuery', { defaultMessage: 'Query #' }),
        icon: 'img sql-file',
        tooltip,
        tabComponent: 'QueryTab',
        focused: true,
        props: {
          conid: connection._id,
          database: name,
        },
      });
    };

    const handleNewTable = () => {
      newTable(connection, name);
    };

    const handleDropDatabase = () => {
      showModal(ConfirmModal, {
        message: _t('database.dropConfirm', {
          defaultMessage:
            'Really drop database {name}? All opened sessions with this database will be forcefully closed.',
          values: { name },
        }),
        onConfirm: () =>
          apiCall('server-connections/drop-database', {
            conid: connection._id,
            name,
          }),
      });
    };

    const handleNewCollection = () => {
      showModal(NewCollectionModal, {
        driver,
        dbid: { conid: connection._id, database: name },
      });
    };

    const handleImport = () => {
      openImportExportTab({
        sourceStorageType: getDefaultFileFormat($extensions).storageType,
        targetStorageType: 'database',
        targetConnectionId: connection._id,
        targetDatabaseName: name,
      });

      // showModal(ImportExportModal, {
      //   initialValues: {
      //     sourceStorageType: getDefaultFileFormat($extensions).storageType,
      //     targetStorageType: 'database',
      //     targetConnectionId: connection._id,
      //     targetDatabaseName: name,
      //   },
      // });
    };

    const handleExport = () => {
      openImportExportTab({
        targetStorageType: getDefaultFileFormat($extensions).storageType,
        sourceStorageType: 'database',
        sourceConnectionId: connection._id,
        sourceDatabaseName: name,
      });

      // showModal(ImportExportModal, {
      //   initialValues: {
      //     targetStorageType: getDefaultFileFormat($extensions).storageType,
      //     sourceStorageType: 'database',
      //     sourceConnectionId: connection._id,
      //     sourceDatabaseName: name,
      //   },
      // });
    };

    const handleSqlGenerator = () => {
      showModal(SqlGeneratorModal, {
        conid: connection._id,
        database: name,
      });
    };

    const handleBackupDatabase = () => {
      openNewTab({
        title: _t('database.backup', { defaultMessage: 'Backup #' }),
        icon: 'img db-backup',
        tabComponent: 'BackupDatabaseTab',
        props: {
          conid: connection._id,
          database: name,
        },
      });
    };

    const handleRestoreDatabase = () => {
      openNewTab({
        title: _t('database.restore', { defaultMessage: 'Restore #' }),
        icon: 'img db-restore',
        tabComponent: 'RestoreDatabaseTab',
        props: {
          conid: connection._id,
          database: name,
        },
      });
    };

    const handleShowDiagram = async () => {
      const db = await getDatabaseInfo({
        conid: connection._id,
        database: name,
      });
      openNewTab(
        {
          title: _t('database.diagram', { defaultMessage: 'Diagram #' }),
          icon: 'img diagram',
          tabComponent: 'DiagramTab',
          props: {
            conid: connection._id,
            database: name,
          },
        },
        {
          editor: {
            tables: db.tables.map(table => ({
              ...table,
              designerId: `${table.pureName}-${uuidv1()}`,
            })),
            references: [],
            autoLayout: true,
          },
        }
      );
    };

    const handleCopyName = async () => {
      copyTextToClipboard(name);
    };

    const handleDisconnect = () => {
      disconnectDatabaseConnection(connection._id, name);
    };

    const handleExportModel = async () => {
      showModal(ExportDbModelModal, {
        conid: connection._id,
        database: name,
      });
      // const resp = await apiCall('database-connections/export-model', {
      //   conid: connection._id,
      //   database: name,
      // });
      // currentArchive.set(resp.archiveFolder);
      // selectedWidget.set('archive');
      // visibleWidgetSideBar.set(true);
      // showSnackbarSuccess(`Saved to archive ${resp.archiveFolder}`);
    };

    const handleDatabaseChat = () => {
      openNewTab({
        title: 'Chat',
        icon: 'img ai',
        tabComponent: 'DatabaseChatTab',
        props: {
          conid: connection._id,
          database: name,
        },
      });
    };

    const handleCompareWithCurrentDb = () => {
      openNewTab(
        {
          title: _t('database.compare', { defaultMessage: 'Compare' }),
          icon: 'img compare',
          tabComponent: 'CompareModelTab',
          props: {
            conid: $currentDatabase?.connection?._id,
            database: $currentDatabase?.name,
          },
        },
        {
          editor: {
            sourceConid: connection?._id,
            sourceDatabase: name,
            targetConid: $currentDatabase?.connection?._id,
            targetDatabase: $currentDatabase?.name,
          },
        }
      );
    };

    // const handleOpenJsonModel = async () => {
    //   const db = await getDatabaseInfo({
    //     conid: connection._id,
    //     database: name,
    //   });
    //   openJsonDocument(db, name);
    // };

    const handleGenerateScript = async () => {
      const data = await apiCall('database-connections/export-keys', {
        conid: connection?._id,
        database: name,
        options: {
          keyPrefix: '',
        },
      });

      if (data.errorMessage) {
        showSnackbarError(data.errorMessage);
        return;
      }

      newQuery({
        title: _t('database.export', { defaultMessage: 'Export #' }),
        initialData: data,
      });
    };

    const handleQueryDesigner = () => {
      openNewTab({
        title: _t('database.queryDesigner', { defaultMessage: 'Query #' }),
        icon: 'img query-design',
        tabComponent: 'QueryDesignTab',
        focused: true,
        props: {
          conid: connection?._id,
          database: name,
        },
      });
    };

    const handleNewPerspective = () => {
      openNewTab({
        title: _t('database.perspective', { defaultMessage: 'Perspective #' }),
        icon: 'img perspective',
        tabComponent: 'PerspectiveTab',
        props: {
          conid: connection?._id,
          database: name,
        },
      });
    };

    const handleDatabaseProfiler = () => {
      openNewTab({
        title: _t('database.profiler', { defaultMessage: 'Profiler' }),
        icon: 'img profiler',
        tabComponent: 'ProfilerTab',
        props: {
          conid: connection?._id,
          database: name,
        },
      });
    };

    const handleRefreshSchemas = () => {
      const conid = connection?._id;
      const database = name;
      apiCall('database-connections/dispatch-database-changed-event', {
        event: 'schema-list-changed',
        conid,
        database,
      });
      loadSchemaList(conid, database);
    };

    async function handleConfirmSql(sql) {
      saveScriptToDatabase({ conid: connection?._id, database: name }, sql, false);
    }

    const handleGenerateDropAllObjectsScript = () => {
      showModal(ConfirmModal, {
        message: _t('database.dropAllObjectsConfirm', {
          defaultMessage:
            'This will generate script, after executing this script all objects in {name} will be dropped. Continue?',
          values: { name },
        }),

        onConfirm: () => {
          openNewTab(
            {
              title: _t('database.shellTitle', { defaultMessage: 'Shell #' }),
              icon: 'img shell',
              tabComponent: 'ShellTab',
            },
            {
              editor: `// @require ${extractPackageName(connection.engine)}
        
await dbgateApi.dropAllDbObjects(${JSON.stringify(
                {
                  connection: extractShellConnection(connection, name),
                },
                undefined,
                2
              )})`,
            }
          );
        },
      });
    };

    const handleGenerateRunScript = () => {
      openNewTab(
        {
          title: _t('database.shellTitle', { defaultMessage: 'Shell #' }),
          icon: 'img shell',
          tabComponent: 'ShellTab',
        },
        {
          editor: `// @require ${extractPackageName(connection.engine)}

await dbgateApi.executeQuery(${JSON.stringify(
            {
              connection: extractShellConnection(connection, name),
              sql: 'your script here',
            },
            undefined,
            2
          )});
`,
        }
      );
    };

    const handleShowDataDeployer = () => {
      showModal(ChooseArchiveFolderModal, {
        message: _t('database.chooseArchiveFolderForDataDeployer', {
          defaultMessage: 'Choose archive folder for data deployer',
        }),
        onConfirm: archiveFolder => {
          openNewTab(
            {
              title: archiveFolder,
              icon: 'img replicator',
              tabComponent: 'DataDeployTab',
              props: {
                conid: connection?._id,
                database: name,
              },
            },
            {
              editor: {
                archiveFolder,
                conid: connection?._id,
                database: name,
              },
            }
          );
        },
      });
    };

    const driver = findEngineDriver(connection, getExtensions());

    const commands = _.flatten((apps || []).map(x => x.commands || []));

    const isSqlOrDoc =
      driver?.databaseEngineTypes?.includes('sql') || driver?.databaseEngineTypes?.includes('document');

    return [
      hasPermission(`dbops/query`) && {
        onClick: handleNewQuery,
        text: _t('database.newQuery', { defaultMessage: 'New query' }),
        isNewQuery: true,
      },
      hasPermission(`dbops/model/edit`) &&
        !connection.isReadOnly &&
        driver?.databaseEngineTypes?.includes('sql') && {
          onClick: handleNewTable,
          text: _t('database.newTable', { defaultMessage: 'New table' }),
        },
      !connection.isReadOnly &&
        hasPermission(`dbops/model/edit`) &&
        driver?.databaseEngineTypes?.includes('document') && {
          onClick: handleNewCollection,
          text: _t('database.newCollection', {
            defaultMessage: 'New {collectionLabel}',
            values: { collectionLabel: driver?.collectionSingularLabel ?? 'collection/container' },
          }),
        },
      hasPermission(`dbops/query`) &&
        driver?.databaseEngineTypes?.includes('sql') &&
        isProApp() && {
          onClick: handleQueryDesigner,
          text: _t('database.designQuery', { defaultMessage: 'Design query' }),
        },
      driver?.databaseEngineTypes?.includes('sql') &&
        isProApp() && {
          onClick: handleNewPerspective,
          text: _t('database.designPerspectiveQuery', { defaultMessage: 'Design perspective query' }),
        },
      connection.useSeparateSchemas && {
        onClick: handleRefreshSchemas,
        text: _t('database.refreshSchemas', { defaultMessage: 'Refresh schemas' }),
      },

      { divider: true },
      isSqlOrDoc &&
        !connection.isReadOnly &&
        hasPermission(`dbops/import`) && {
          onClick: handleImport,
          text: _t('database.import', { defaultMessage: 'Import' }),
        },
      isSqlOrDoc &&
        hasPermission(`dbops/export`) && {
          onClick: handleExport,
          text: _t('database.export', { defaultMessage: 'Export' }),
        },
      driver?.supportsDatabaseRestore &&
        isProApp() &&
        hasPermission(`dbops/sql-dump/import`) &&
        !connection.isReadOnly && {
          onClick: handleRestoreDatabase,
          text: _t('database.restoreDatabaseBackup', { defaultMessage: 'Restore database backup' }),
        },
      driver?.supportsDatabaseBackup &&
        isProApp() &&
        hasPermission(`dbops/sql-dump/export`) && {
          onClick: handleBackupDatabase,
          text: _t('database.createDatabaseBackup', { defaultMessage: 'Create database backup' }),
        },
      isSqlOrDoc &&
        !connection.isReadOnly &&
        !connection.singleDatabase &&
        isSqlOrDoc &&
        hasPermission(`dbops/dropdb`) && {
          onClick: handleDropDatabase,
          text: _t('database.dropDatabase', { defaultMessage: 'Drop database' }),
        },
      { divider: true },
      driver?.databaseEngineTypes?.includes('sql') && {
        onClick: handleCopyName,
        text: _t('database.copyDatabaseName', { defaultMessage: 'Copy database name' }),
      },
      driver?.databaseEngineTypes?.includes('sql') && {
        onClick: handleShowDiagram,
        text: _t('database.showDiagram', { defaultMessage: 'Show diagram' }),
      },
      driver?.databaseEngineTypes?.includes('sql') &&
        hasPermission(`dbops/sql-generator`) && {
          onClick: handleSqlGenerator,
          text: _t('database.sqlGenerator', { defaultMessage: 'SQL Generator' }),
        },
      driver?.supportsDatabaseProfiler &&
        isProApp() &&
        hasPermission(`dbops/profiler`) && {
          onClick: handleDatabaseProfiler,
          text: _t('database.databaseProfiler', { defaultMessage: 'Database profiler' }),
        },
      // isSqlOrDoc &&
      //   isSqlOrDoc &&
      //   hasPermission(`dbops/model/view`) && { onClick: handleOpenJsonModel, text: 'Open model as JSON' },
      isSqlOrDoc &&
        isProApp() &&
        hasPermission(`dbops/model/view`) && {
          onClick: handleExportModel,
          text: _t('database.exportDbModel', { defaultMessage: 'Export DB model' }),
        },
      isProApp() &&
        driver?.databaseEngineTypes?.includes('sql') &&
        hasPermission('dbops/chat') && {
          onClick: handleDatabaseChat,
          text: _t('database.databaseChat', { defaultMessage: 'Database chat' }),
        },
      isSqlOrDoc &&
        _.get($currentDatabase, 'connection._id') &&
        hasPermission('dbops/model/compare') &&
        isProApp() &&
        (_.get($currentDatabase, 'connection._id') != _.get(connection, '_id') ||
          (_.get($currentDatabase, 'connection._id') == _.get(connection, '_id') &&
            _.get($currentDatabase, 'name') != _.get(connection, 'name'))) && {
          onClick: handleCompareWithCurrentDb,
          text: _t('database.compareWithCurrentDb', {
            defaultMessage: 'Compare with {name}',
            values: { name: _.get($currentDatabase, 'name') },
          }),
        },

      driver?.databaseEngineTypes?.includes('keyvalue') && {
        onClick: handleGenerateScript,
        text: _t('database.generateScript', { defaultMessage: 'Generate script' }),
      },

      ($openedSingleDatabaseConnections.includes(connection._id) ||
        (_.get($currentDatabase, 'connection._id') == _.get(connection, '_id') &&
          _.get($currentDatabase, 'name') == name)) && {
        onClick: handleDisconnect,
        text: _t('database.disconnect', { defaultMessage: 'Disconnect' }),
      },

      { divider: true },

      driver?.databaseEngineTypes?.includes('sql') &&
        hasPermission(`dbops/dropdb`) && {
          onClick: handleGenerateDropAllObjectsScript,
          text: _t('database.shellDropAllObjects', { defaultMessage: 'Shell: Drop all objects' }),
        },

      {
        onClick: handleGenerateRunScript,
        text: _t('database.shellRunScript', { defaultMessage: 'Shell: Run script' }),
      },

      driver?.databaseEngineTypes?.includes('sql') &&
        hasPermission(`dbops/import`) && {
          onClick: handleShowDataDeployer,
          text: _t('database.dataDeployer', { defaultMessage: 'Data deployer' }),
        },

      { divider: true },

      commands.length > 0 && [
        commands.map((cmd: any) => ({
          text: cmd.name,
          onClick: () => {
            showModal(ConfirmSqlModal, {
              sql: cmd.sql,
              onConfirm: () => handleConfirmSql(cmd.sql),
              engine: driver.engine,
            });
          },
        })),
      ],
    ];
  }
</script>

<script lang="ts">
  import uuidv1 from 'uuid/v1';

  import _, { find } from 'lodash';
  import { showModal } from '../modals/modalTools';
  import SqlGeneratorModal from '../modals/SqlGeneratorModal.svelte';
  import { getDefaultFileFormat } from '../plugins/fileformats';
  import {
    currentArchive,
    currentDatabase,
    extensions,
    focusedConnectionOrDatabase,
    getCurrentDatabase,
    getExtensions,
    getOpenedTabs,
    loadingSchemaLists,
    lockedDatabaseMode,
    openedConnections,
    openedSingleDatabaseConnections,
    openedTabs,
    pinnedDatabases,
    selectedWidget,
    visibleWidgetSideBar,
  } from '../stores';
  import getElectron from '../utility/getElectron';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import { showSnackbarError, showSnackbarSuccess } from '../utility/snackbar';
  import {
    extractDbNameFromComposite,
    extractPackageName,
    filterName,
    findEngineDriver,
    getConnectionLabel,
  } from 'dbgate-tools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { getDatabaseInfo, useUsedApps } from '../utility/metadataLoaders';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';
  import { apiCall } from '../utility/api';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import ConfirmSqlModal, { runOperationOnDatabase, saveScriptToDatabase } from '../modals/ConfirmSqlModal.svelte';
  import { filterAppsForDatabase } from '../utility/appTools';
  import newQuery from '../query/newQuery';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { closeMultipleTabs } from '../tabpanel/TabsPanel.svelte';
  import NewCollectionModal from '../modals/NewCollectionModal.svelte';
  import hasPermission from '../utility/hasPermission';
  import { openImportExportTab } from '../utility/importExportTools';
  import newTable from '../tableeditor/newTable';
  import { loadSchemaList, switchCurrentDatabase } from '../utility/common';
  import { isProApp } from '../utility/proTools';
  import ExportDbModelModal from '../modals/ExportDbModelModal.svelte';
  import ChooseArchiveFolderModal from '../modals/ChooseArchiveFolderModal.svelte';
  import { extractShellConnection } from '../impexp/createImpExpScript';
  import { getNumberIcon } from '../icons/FontIcon.svelte';
  import { getDatabaseClickActionSetting } from '../settings/settingsTools';
  import { _t } from '../translations';

  export let data;
  export let passProps;

  function createMenu() {
    return getDatabaseMenuItems(
      data.connection,
      data.name,
      $extensions,
      $currentDatabase,
      $apps,
      $openedSingleDatabaseConnections
    );
  }

  $: isPinned = !!$pinnedDatabases.find(x => x?.name == data.name && x?.connection?._id == data.connection?._id);
  $: apps = useUsedApps();
  $: isLoadingSchemas = $loadingSchemaLists[`${data?.connection?._id}::${data?.name}`];
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.name}
  extInfo={data.extInfo}
  icon="img database"
  colorMark={passProps?.connectionColorFactory &&
    passProps?.connectionColorFactory({ conid: data?.connection?._id, database: data.name }, null, null, false)}
  isBold={$currentDatabase?.connection?._id == data?.connection?._id &&
    extractDbNameFromComposite($currentDatabase?.name) == data.name}
  on:dblclick={() => {
    switchCurrentDatabase(data);
    // passProps?.onFocusSqlObjectList?.();
  }}
  on:click={() => {
    // switchCurrentDatabase(data);
    if (getDatabaseClickActionSetting() == 'switch') {
      switchCurrentDatabase(data);
    }
  }}
  on:mousedown={() => {
    $focusedConnectionOrDatabase = { conid: data.connection?._id, database: data.name, connection: data.connection };
  }}
  on:dragstart
  on:dragenter
  on:dragend
  on:drop
  on:middleclick={() => {
    createMenu()
      .find(x => x.isNewQuery)
      .onClick();
  }}
  statusIcon={isLoadingSchemas
    ? 'icon loading'
    : $lockedDatabaseMode
      ? getNumberIcon(
          $openedTabs.filter(
            x => !x.closedTime && x.props?.conid == data?.connection?._id && x.props?.database == data?.name
          ).length
        )
      : ''}
  menu={createMenu}
  showPinnedInsteadOfUnpin={passProps?.showPinnedInsteadOfUnpin}
  onPin={isPinned ? null : () => pinnedDatabases.update(list => [...list, data])}
  onUnpin={isPinned
    ? () =>
        pinnedDatabases.update(list =>
          list.filter(x => x?.name != data?.name || x?.connection?._id != data?.connection?._id)
        )
    : null}
  isChoosed={data.connection?._id == $focusedConnectionOrDatabase?.conid &&
    data.name == $focusedConnectionOrDatabase?.database}
  disableBoldScroll={!!$focusedConnectionOrDatabase}
  divProps={{
    'data-testid': `DatabaseAppObject_${data.name}`,
  }}
/>
