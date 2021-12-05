<script lang="ts" context="module">
  export const extractKey = props => props.name;
  const electron = getElectron();

  export function getDatabaseMenuItems(connection, name, $extensions, $currentDatabase) {
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
        }
      );
    };

    const handleNewCollection = () => {
      showModal(InputTextModal, {
        value: '',
        label: 'New collection name',
        header: 'Create collection',
        onConfirm: async newCollection => {
          const dbid = { conid: connection._id, database: name };
          await axiosInstance.request({
            url: 'database-connections/run-script',
            method: 'post',
            params: dbid,
            data: { sql: `db.createCollection('${newCollection}')` },
          });
          axiosInstance.post('database-connections/sync-model', dbid);
        },
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

    const handleDisconnect = () => {
      if (electron) {
        axiosInstance.post('database-connections/disconnect', { conid: connection._id, database: name });
      }
      currentDatabase.set(null);
    };

    const handleExportModel = async () => {
      const resp = await axiosInstance.post('database-connections/export-model', {
        conid: connection._id,
        database: name,
      });
      currentArchive.set(resp.data.archiveFolder);
      selectedWidget.set('archive');
      showSnackbarSuccess(`Saved to archive ${resp.data.archiveFolder}`);
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

    const driver = findEngineDriver(connection, getExtensions());

    return [
      { onClick: handleNewQuery, text: 'New query', isNewQuery: true },
      !driver?.dialect?.nosql && { onClick: handleNewTable, text: 'New table' },
      driver?.dialect?.nosql && { onClick: handleNewCollection, text: 'New collection' },
      { divider: true },
      { onClick: handleImport, text: 'Import' },
      { onClick: handleExport, text: 'Export' },
      { onClick: handleSqlGenerator, text: 'SQL Generator' },
      { onClick: handleOpenJsonModel, text: 'Open model as JSON' },
      { onClick: handleExportModel, text: 'Export DB model - experimental' },
      _.get($currentDatabase, 'connection._id') &&
        (_.get($currentDatabase, 'connection._id') != _.get(connection, '_id') ||
          (_.get($currentDatabase, 'connection._id') == _.get(connection, '_id') &&
            _.get($currentDatabase, 'name') != _.get(connection, 'name'))) && {
          onClick: handleCompareWithCurrentDb,
          text: `Compare with ${_.get($currentDatabase, 'name')}`,
        },

      _.get($currentDatabase, 'connection._id') == _.get(connection, '_id') &&
        _.get($currentDatabase, 'name') == name && { onClick: handleDisconnect, text: 'Disconnect' },
    ];
  }
</script>

<script lang="ts">
  import getConnectionLabel from '../utility/getConnectionLabel';

  import _, { find } from 'lodash';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
  import SqlGeneratorModal from '../modals/SqlGeneratorModal.svelte';
  import { getDefaultFileFormat } from '../plugins/fileformats';
  import {
    currentArchive,
    currentDatabase,
    extensions,
    getExtensions,
    pinnedDatabases,
    selectedWidget,
  } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import getElectron from '../utility/getElectron';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import { findEngineDriver } from 'dbgate-tools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { getDatabaseInfo } from '../utility/metadataLoaders';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';

  export let data;
  export let passProps;

  function createMenu() {
    return getDatabaseMenuItems(data.connection, data.name, $extensions, $currentDatabase);
  }

  $: isPinned = !!$pinnedDatabases.find(x => x.name == data.name && x.connection?._id == data.connection?._id);
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.name}
  icon="img database"
  colorMark={passProps?.connectionColorFactory &&
    passProps?.connectionColorFactory({ conid: _.get(data.connection, '_id'), database: data.name }, null, null, false)}
  isBold={_.get($currentDatabase, 'connection._id') == _.get(data.connection, '_id') &&
    _.get($currentDatabase, 'name') == data.name}
  on:click={() => ($currentDatabase = data)}
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
          list.filter(x => x.name != data.name || x.connection?._id != data.connection?._id)
        )
    : null}
/>
