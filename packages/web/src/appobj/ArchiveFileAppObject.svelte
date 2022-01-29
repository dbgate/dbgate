<script lang="ts" context="module">
  function openArchive(fileName, folderName) {
    openNewTab({
      title: fileName,
      icon: 'img archive',
      tooltip: `${folderName}\n${fileName}`,
      tabComponent: 'ArchiveFileTab',
      props: {
        archiveFile: fileName,
        archiveFolder: folderName,
      },
    });
  }

  async function openTextFile(fileName, fileType, folderName, tabComponent, icon) {
    const connProps: any = {};
    let tooltip = undefined;

    const resp = await apiCall('files/load', {
      folder: 'archive:' + folderName,
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
          savedFolder: 'archive:' + folderName,
          savedFormat: 'text',
          archiveFolder: folderName,
          ...connProps,
        },
      },
      { editor: resp }
    );
  }

  export const extractKey = data => data.fileName;
  export const createMatcher = ({ fileName }) => filter => filterName(filter, fileName);
  const ARCHIVE_ICONS = {
    'table.yaml': 'img table',
    'view.sql': 'img view',
    'proc.sql': 'img procedure',
    'func.sql': 'img function',
    'trigger.sql': 'img sql-file',
    'matview.sql': 'img view',
  };

  function getArchiveIcon(archiveFilesAsDataSheets, data) {
    if (data.fileType == 'jsonl') {
      return isArchiveFileMarkedAsDataSheet(archiveFilesAsDataSheets, data.folderName, data.fileName)
        ? 'img free-table'
        : 'img archive';
    }
    return ARCHIVE_ICONS[data.fileType];
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { filterName } from 'dbgate-tools';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';

  import { archiveFilesAsDataSheets, currentArchive, extensions, getCurrentDatabase } from '../stores';

  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import { exportElectronFile } from '../utility/exportElectronFile';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import {
    isArchiveFileMarkedAsDataSheet,
    markArchiveFileAsDataSheet,
    markArchiveFileAsReadonly,
  } from '../utility/archiveTools';
  import { apiCall } from '../utility/api';

  export let data;

  const handleRename = () => {
    showModal(InputTextModal, {
      value: data.fileName,
      label: 'New file name',
      header: 'Rename file',
      onConfirm: newFile => {
        apiCall('archive/rename-file', {
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
        apiCall('archive/delete-file', {
          file: data.fileName,
          folder: data.folderName,
          fileType: data.fileType,
        });
      },
    });
  };
  const handleOpenRead = () => {
    markArchiveFileAsReadonly(data.folderName, data.fileName);
    openArchive(data.fileName, data.folderName);
  };
  const handleOpenWrite = () => {
    markArchiveFileAsDataSheet(data.folderName, data.fileName);
    openNewTab({
      title: data.fileName,
      icon: 'img free-table',
      tabComponent: 'FreeTableTab',
      props: {
        initialArgs: {
          functionName: 'archiveReader',
          props: {
            fileName: data.fileName,
            folderName: data.folderName,
          },
        },
        archiveFile: data.fileName,
        archiveFolder: data.folderName,
      },
    });
  };
  const handleClick = () => {
    if (data.fileType == 'jsonl') {
      if (isArchiveFileMarkedAsDataSheet($archiveFilesAsDataSheets, data.folderName, data.fileName)) {
        handleOpenWrite();
      } else {
        handleOpenRead();
      }
    }
    if (data.fileType.endsWith('.sql')) {
      handleOpenSqlFile();
    }
    if (data.fileType.endsWith('.yaml')) {
      handleOpenYamlFile();
    }
  };
  const handleOpenSqlFile = () => {
    openTextFile(data.fileName, data.fileType, data.folderName, 'QueryTab', 'img sql-file');
  };
  const handleOpenYamlFile = () => {
    openTextFile(data.fileName, data.fileType, data.folderName, 'YamlEditorTab', 'img yaml');
  };

  function createMenu() {
    return [
      data.fileType == 'jsonl' && { text: 'Open (readonly)', onClick: handleOpenRead },
      data.fileType == 'jsonl' && { text: 'Open as data sheet', onClick: handleOpenWrite },
      { text: 'Delete', onClick: handleDelete },
      { text: 'Rename', onClick: handleRename },
      data.fileType == 'jsonl' &&
        createQuickExportMenu($extensions, fmt => async () => {
          exportElectronFile(
            data.fileName,
            {
              functionName: 'archiveReader',
              props: {
                fileName: data.fileName,
                folderName: data.folderName,
              },
            },
            fmt
          );
        }),
      data.fileType == 'jsonl' && {
        text: 'Export',
        onClick: () => {
          showModal(ImportExportModal, {
            initialValues: {
              sourceStorageType: 'archive',
              sourceArchiveFolder: data.folderName,
              sourceList: [data.fileName],
            },
          });
        },
      },
      data.fileType.endsWith('.sql') && { text: 'Open SQL', onClick: handleOpenSqlFile },
      data.fileType.endsWith('.yaml') && { text: 'Open YAML', onClick: handleOpenYamlFile },
    ];
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.fileLabel}
  icon={getArchiveIcon($archiveFilesAsDataSheets, data)}
  menu={createMenu}
  on:click={handleClick}
/>
