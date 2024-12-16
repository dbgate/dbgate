<script lang="ts" context="module">
  async function openTextFile(fileName, fileType, folderName, tabComponent, icon) {
    const connProps: any = {};
    let tooltip = undefined;

    const resp = await apiCall('files/load', {
      folder: 'app:' + folderName,
      file: fileName + '.' + fileType,
      format: 'text',
    });

    openNewTab(
      {
        title: fileName,
        icon,
        tabComponent,
        tooltip,
        props: {
          savedFile: fileName + '.' + fileType,
          savedFolder: 'app:' + folderName,
          savedFormat: 'text',
          appFolder: folderName,
          ...connProps,
        },
      },
      { editor: resp }
    );
  }

  export const extractKey = data => data.fileName;
  export const createMatcher =
    filter =>
    ({ fileName }) =>
      filterName(filter, fileName);
  const APP_ICONS = {
    'config.json': 'img json',
    'command.sql': 'img app-command',
    'query.sql': 'img app-query',
  };

  function getAppIcon(data) {
    return APP_ICONS[data.fileType];
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { filterName } from 'dbgate-tools';
  import { showModal } from '../modals/modalTools';

  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { apiCall } from '../utility/api';

  export let data;

  const handleRename = () => {
    showModal(InputTextModal, {
      value: data.fileName,
      label: 'New file name',
      header: 'Rename file',
      onConfirm: newFile => {
        apiCall('apps/rename-file', {
          file: data.fileName,
          folder: data.folderName,
          fileType: data.fileType,
          newFile,
        });
      },
    });
  };

  const handleDelete = () => {
    showModal(ConfirmModal, {
      message: `Really delete file ${data.fileName}?`,
      onConfirm: () => {
        apiCall('apps/delete-file', {
          file: data.fileName,
          folder: data.folderName,
          fileType: data.fileType,
        });
      },
    });
  };
  const handleClick = () => {
    if (data.fileType.endsWith('.sql')) {
      handleOpenSqlFile();
    }
    if (data.fileType.endsWith('.json')) {
      handleOpenJsonFile();
    }
  };
  const handleOpenSqlFile = () => {
    openTextFile(data.fileName, data.fileType, data.folderName, 'QueryTab', 'img sql-file');
  };
  const handleOpenJsonFile = () => {
    openTextFile(data.fileName, data.fileType, data.folderName, 'JsonEditorTab', 'img json');
  };

  function createMenu() {
    return [
      { text: 'Delete', onClick: handleDelete },
      { text: 'Rename', onClick: handleRename },
      data.fileType.endsWith('.sql') && { text: 'Open SQL', onClick: handleOpenSqlFile },
      data.fileType.endsWith('.json') && { text: 'Open JSON', onClick: handleOpenJsonFile },

      // data.fileType.endsWith('.yaml') && { text: 'Open YAML', onClick: handleOpenYamlFile },
    ];
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.fileLabel}
  icon={getAppIcon(data)}
  menu={createMenu}
  on:click={handleClick}
/>
