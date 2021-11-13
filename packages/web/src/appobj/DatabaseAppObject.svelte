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

    return [
      { onClick: handleNewQuery, text: 'New query', isNewQuery: true },
      { onClick: handleImport, text: 'Import' },
      { onClick: handleExport, text: 'Export' },
      { onClick: handleSqlGenerator, text: 'SQL Generator' },
      { onClick: handleExportModel, text: 'Export DB model' },
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
  import { currentArchive, currentDatabase, extensions, selectedWidget } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import getElectron from '../utility/getElectron';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import { showSnackbarSuccess } from '../utility/snackbar';
  export let data;

  function createMenu() {
    return getDatabaseMenuItems(data.connection, data.name, $extensions, $currentDatabase);
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.name}
  icon="img database"
  isBold={_.get($currentDatabase, 'connection._id') == _.get(data.connection, '_id') &&
    _.get($currentDatabase, 'name') == data.name}
  on:click={() => ($currentDatabase = data)}
  on:middleclick={() => {
    createMenu()
      .find(x => x.isNewQuery)
      .onClick();
  }}
  menu={createMenu}
/>
