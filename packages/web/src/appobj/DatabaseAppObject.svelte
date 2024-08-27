<script lang="ts" context="module">
  import { copyTextToClipboard } from '../utility/clipboard';

  export const extractKey = props => props.name;

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
      currentDatabase.set(null);
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
        props: {
          conid: connection._id,
          database: name,
        },
      });
    };

    const handleNewTable = () => {
      const tooltip = `${getConnectionLabel(connection)}\n${name}`;
      openNewTab(
        {
          title: 'Table #',
          tooltip,
          icon: 'img table-structure',
          tabComponent: 'TableStructureTab',
          props: {
            conid: connection._id,
            database: name,
          },
        },
        {
          editor: {
            columns: [],
          },
        },
        {
          forceNewTab: true,
        }
      );
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
      showModal(ImportExportModal, {
        initialValues: {
          sourceStorageType: getDefaultFileFormat($extensions).storageType,
          targetStorageType: 'database',
          targetConnectionId: connection._id,
          targetDatabaseName: name,
        },
      });
    };

    const handleExport = () => {
      showModal(ImportExportModal, {
        initialValues: {
          targetStorageType: getDefaultFileFormat($extensions).storageType,
          sourceStorageType: 'database',
          sourceConnectionId: connection._id,
          sourceDatabaseName: name,
        },
      });
    };

    const handleSqlGenerator = () => {
      showModal(SqlGeneratorModal, {
        conid: connection._id,
        database: name,
      });
    };

    const handleSqlDump = () => {
      showModal(ExportDatabaseDumpModal, {
        connection: { ...connection, database: name },
      });
      // exportSqlDump(connection, name);
    };

    const handleSqlRestore = () => {
      showModal(ImportDatabaseDumpModal, {
        connection: { ...connection, database: name },
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
      const resp = await apiCall('database-connections/export-model', {
        conid: connection._id,
        database: name,
      });
      currentArchive.set(resp.archiveFolder);
      selectedWidget.set('archive');
      visibleWidgetSideBar.set(true);
      showSnackbarSuccess(`Saved to archive ${resp.archiveFolder}`);
    };

    const handleCompareWithCurrentDb = () => {
      openNewTab(
        {
          title: 'Compare',
          icon: 'img compare',
          tabComponent: 'CompareModelTab',
        },
        {
          editor: {
            sourceConid: _.get($currentDatabase, 'connection._id'),
            sourceDatabase: _.get($currentDatabase, 'name'),
            targetConid: _.get(connection, '_id'),
            targetDatabase: name,
          },
        }
      );
    };

    const handleOpenJsonModel = async () => {
      const db = await getDatabaseInfo({
        conid: connection._id,
        database: name,
      });
      openJsonDocument(db, name);
    };

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
        props: {
          conid: connection._id,
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
          conid: connection._id,
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
          conid: connection._id,
          database: name,
        },
      });
    };

    async function handleConfirmSql(sql) {
      saveScriptToDatabase({ conid: connection._id, database: name }, sql, false);
    }

    const driver = findEngineDriver(connection, getExtensions());

    const commands = _.flatten((apps || []).map(x => x.commands || []));

    const isSqlOrDoc =
      driver?.databaseEngineTypes?.includes('sql') || driver?.databaseEngineTypes?.includes('document');

    return [
      { onClick: handleNewQuery, text: 'New query', isNewQuery: true },
      driver?.databaseEngineTypes?.includes('sql') && { onClick: handleNewTable, text: 'New table' },
      driver?.databaseEngineTypes?.includes('document') && {
        onClick: handleNewCollection,
        text: `New ${driver?.collectionSingularLabel ?? 'collection/container'}`,
      },
      driver?.databaseEngineTypes?.includes('sql') && { onClick: handleQueryDesigner, text: 'Design query' },
      driver?.databaseEngineTypes?.includes('sql') && {
        onClick: handleNewPerspective,
        text: 'Design perspective query',
      },
      { divider: true },
      isSqlOrDoc && !connection.isReadOnly && { onClick: handleImport, text: 'Import wizard' },
      isSqlOrDoc && { onClick: handleExport, text: 'Export wizard' },
      driver?.databaseEngineTypes?.includes('sql') &&
        !connection.isReadOnly && { onClick: handleSqlRestore, text: 'Restore/import SQL dump' },
      driver?.supportsDatabaseDump && { onClick: handleSqlDump, text: 'Backup/export SQL dump' },
      isSqlOrDoc &&
        !connection.isReadOnly &&
        !connection.singleDatabase && { onClick: handleDropDatabase, text: 'Drop database' },
      { divider: true },
      driver?.databaseEngineTypes?.includes('sql') && { onClick: handleCopyName, text: 'Copy database name' },
      driver?.databaseEngineTypes?.includes('sql') && { onClick: handleShowDiagram, text: 'Show diagram' },
      driver?.databaseEngineTypes?.includes('sql') && { onClick: handleSqlGenerator, text: 'SQL Generator' },
      driver?.supportsDatabaseProfiler && { onClick: handleDatabaseProfiler, text: 'Database profiler' },
      isSqlOrDoc && { onClick: handleOpenJsonModel, text: 'Open model as JSON' },
      isSqlOrDoc && { onClick: handleExportModel, text: 'Export DB model - experimental' },
      isSqlOrDoc &&
        _.get($currentDatabase, 'connection._id') &&
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

      commands.length > 0 && [
        { divider: true },
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
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
  import SqlGeneratorModal from '../modals/SqlGeneratorModal.svelte';
  import { getDefaultFileFormat } from '../plugins/fileformats';
  import {
    currentArchive,
    currentDatabase,
    extensions,
    getCurrentDatabase,
    getExtensions,
    getOpenedTabs,
    openedConnections,
    openedSingleDatabaseConnections,
    pinnedDatabases,
    selectedWidget,
    visibleWidgetSideBar,
  } from '../stores';
  import getElectron from '../utility/getElectron';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import { showSnackbarError, showSnackbarSuccess } from '../utility/snackbar';
  import { findEngineDriver, getConnectionLabel } from 'dbgate-tools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { getDatabaseInfo, useUsedApps } from '../utility/metadataLoaders';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';
  import { apiCall } from '../utility/api';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import ConfirmSqlModal, { runOperationOnDatabase, saveScriptToDatabase } from '../modals/ConfirmSqlModal.svelte';
  import { filterAppsForDatabase } from '../utility/appTools';
  import newQuery from '../query/newQuery';
  import { exportSqlDump } from '../utility/exportFileTools';
  import ImportDatabaseDumpModal from '../modals/ImportDatabaseDumpModal.svelte';
  import ExportDatabaseDumpModal from '../modals/ExportDatabaseDumpModal.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { closeMultipleTabs } from '../tabpanel/TabsPanel.svelte';
  import NewCollectionModal from '../modals/NewCollectionModal.svelte';

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
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.name}
  extInfo={data.extInfo}
  icon="img database"
  colorMark={passProps?.connectionColorFactory &&
    passProps?.connectionColorFactory({ conid: _.get(data.connection, '_id'), database: data.name }, null, null, false)}
  isBold={_.get($currentDatabase, 'connection._id') == _.get(data.connection, '_id') &&
    _.get($currentDatabase, 'name') == data.name}
  on:click={() => ($currentDatabase = data)}
  on:dragstart
  on:dragenter
  on:dragend
  on:drop
  on:middleclick={() => {
    createMenu()
      .find(x => x.isNewQuery)
      .onClick();
  }}
  menu={createMenu}
  showPinnedInsteadOfUnpin={passProps?.showPinnedInsteadOfUnpin}
  onPin={isPinned ? null : () => pinnedDatabases.update(list => [...list, data])}
  onUnpin={isPinned
    ? () =>
        pinnedDatabases.update(list =>
          list.filter(x => x?.name != data?.name || x?.connection?._id != data?.connection?._id)
        )
    : null}
/>
