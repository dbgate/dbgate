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
          message: `Closing connection will close ${count} opened tabs, continue?`,
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
        title: 'Query #',
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
        message: `Really drop database ${name}? All opened sessions with this database will be forcefully closed.`,
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
        title: 'Backup #',
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
        title: 'Restore #',
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
          title: 'Diagram #',
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

    const handleCompareWithCurrentDb = () => {
      openNewTab(
        {
          title: 'Compare',
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
        title: 'Export #',
        initialData: data,
      });
    };

    const handleQueryDesigner = () => {
      openNewTab({
        title: 'Query #',
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
        title: 'Perspective #',
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
        title: 'Profiler',
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
        message: `This will generate script, after executing this script all objects in ${name} will be dropped. Continue?`,

        onConfirm: () => {
          openNewTab(
            {
              title: 'Shell #',
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

    const handleImportWithDbDuplicator = () => {
      showModal(ChooseArchiveFolderModal, {
        message: 'Choose archive folder for import from',
        onConfirm: archiveFolder => {
          openNewTab(
            {
              title: archiveFolder,
              icon: 'img duplicator',
              tabComponent: 'DataDuplicatorTab',
              props: {
                conid: connection?._id,
                database: name,
              },
            },
            {
              editor: {
                archiveFolder,
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
      hasPermission(`dbops/query`) && { onClick: handleNewQuery, text: 'New query', isNewQuery: true },
      hasPermission(`dbops/model/edit`) &&
        !connection.isReadOnly &&
        driver?.databaseEngineTypes?.includes('sql') && { onClick: handleNewTable, text: 'New table' },
      !connection.isReadOnly &&
        hasPermission(`dbops/model/edit`) &&
        driver?.databaseEngineTypes?.includes('document') && {
          onClick: handleNewCollection,
          text: `New ${driver?.collectionSingularLabel ?? 'collection/container'}`,
        },
      hasPermission(`dbops/query`) &&
        driver?.databaseEngineTypes?.includes('sql') &&
        isProApp() && { onClick: handleQueryDesigner, text: 'Design query' },
      driver?.databaseEngineTypes?.includes('sql') &&
        isProApp() && {
          onClick: handleNewPerspective,
          text: 'Design perspective query',
        },
      connection.useSeparateSchemas && { onClick: handleRefreshSchemas, text: 'Refresh schemas' },

      { divider: true },
      isSqlOrDoc &&
        !connection.isReadOnly &&
        hasPermission(`dbops/import`) && { onClick: handleImport, text: 'Import' },
      isSqlOrDoc && hasPermission(`dbops/export`) && { onClick: handleExport, text: 'Export' },
      driver?.supportsDatabaseRestore &&
        isProApp() &&
        hasPermission(`dbops/sql-dump/import`) &&
        !connection.isReadOnly && { onClick: handleRestoreDatabase, text: 'Restore database backup' },
      driver?.supportsDatabaseBackup &&
        isProApp() &&
        hasPermission(`dbops/sql-dump/export`) && { onClick: handleBackupDatabase, text: 'Create database backup' },
      isSqlOrDoc &&
        !connection.isReadOnly &&
        !connection.singleDatabase &&
        isSqlOrDoc &&
        hasPermission(`dbops/dropdb`) && { onClick: handleDropDatabase, text: 'Drop database' },
      { divider: true },
      driver?.databaseEngineTypes?.includes('sql') && { onClick: handleCopyName, text: 'Copy database name' },
      driver?.databaseEngineTypes?.includes('sql') && { onClick: handleShowDiagram, text: 'Show diagram' },
      driver?.databaseEngineTypes?.includes('sql') &&
        hasPermission(`dbops/sql-generator`) && { onClick: handleSqlGenerator, text: 'SQL Generator' },
      driver?.supportsDatabaseProfiler &&
        hasPermission(`dbops/profiler`) && { onClick: handleDatabaseProfiler, text: 'Database profiler' },
      // isSqlOrDoc &&
      //   isSqlOrDoc &&
      //   hasPermission(`dbops/model/view`) && { onClick: handleOpenJsonModel, text: 'Open model as JSON' },
      isSqlOrDoc &&
        isProApp() &&
        hasPermission(`dbops/model/view`) && { onClick: handleExportModel, text: 'Export DB model' },
      isSqlOrDoc &&
        _.get($currentDatabase, 'connection._id') &&
        hasPermission('dbops/model/compare') &&
        isProApp() &&
        (_.get($currentDatabase, 'connection._id') != _.get(connection, '_id') ||
          (_.get($currentDatabase, 'connection._id') == _.get(connection, '_id') &&
            _.get($currentDatabase, 'name') != _.get(connection, 'name'))) && {
          onClick: handleCompareWithCurrentDb,
          text: `Compare with ${_.get($currentDatabase, 'name')}`,
        },

      driver?.databaseEngineTypes?.includes('keyvalue') && { onClick: handleGenerateScript, text: 'Generate script' },

      ($openedSingleDatabaseConnections.includes(connection._id) ||
        (_.get($currentDatabase, 'connection._id') == _.get(connection, '_id') &&
          _.get($currentDatabase, 'name') == name)) && { onClick: handleDisconnect, text: 'Disconnect' },

      { divider: true },

      driver?.databaseEngineTypes?.includes('sql') &&
        hasPermission(`dbops/dropdb`) && {
          onClick: handleGenerateDropAllObjectsScript,
          text: 'Shell: Drop all objects',
        },

      driver?.databaseEngineTypes?.includes('sql') &&
        hasPermission(`dbops/import`) && {
          onClick: handleImportWithDbDuplicator,
          text: 'Import with DB duplicator',
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
