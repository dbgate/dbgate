<script lang="ts" context="module">
  export const extractKey = props => props.name;
</script>

<script lang="ts">
  import _ from 'lodash';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { getDefaultFileFormat } from '../plugins/fileformats';
  import { currentDatabase, extensions } from '../stores';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  export let data;

  const handleNewQuery = () => {
    const { connection, name } = data;
    const tooltip = `${connection.displayName || connection.server}\n${name}`;
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
    const { connection, name } = data;

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
    const { connection, name } = data;

    showModal(ImportExportModal, {
      initialValues: {
        targetStorageType: getDefaultFileFormat($extensions).storageType,
        sourceStorageType: 'database',
        sourceConnectionId: connection._id,
        sourceDatabaseName: name,
      },
    });
  };

  function createMenu() {
    return [
      { onClick: handleNewQuery, text: 'New query' },
      { onClick: handleImport, text: 'Import' },
      { onClick: handleExport, text: 'Export' },
    ];
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
  menu={createMenu}
/>
