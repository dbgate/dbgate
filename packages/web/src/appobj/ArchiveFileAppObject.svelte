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
  export const createMatcher =
    filter =>
    ({ fileName }) =>
      filterName(filter, fileName);
  const ARCHIVE_ICONS = {
    'table.yaml': 'img table',
    'view.sql': 'img view',
    'proc.sql': 'img procedure',
    'func.sql': 'img function',
    'trigger.sql': 'img sql-file',
    'matview.sql': 'img view',
  };

  function getArchiveIcon(data) {
    if (data.fileType == 'jsonl') {
      return 'img archive';
    }
    return ARCHIVE_ICONS[data.fileType];
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { filterName } from 'dbgate-tools';
  import { showModal } from '../modals/modalTools';

  import { getExtensions } from '../stores';

  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import { exportQuickExportFile } from '../utility/exportFileTools';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { apiCall } from '../utility/api';
  import { openImportExportTab } from '../utility/importExportTools';

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
  const handleOpenArchive = () => {
    openArchive(data.fileName, data.folderName);
  };
  const handleClick = () => {
    if (data.fileType == 'jsonl') {
      handleOpenArchive();
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
  const handleOpenJsonLinesText = () => {
    openTextFile(data.fileName, data.fileType, data.folderName, 'JsonLinesEditorTab', 'img json');
  };

  function createMenu() {
    return [
      data.fileType == 'jsonl' && { text: 'Open', onClick: handleOpenArchive },
      data.fileType == 'jsonl' && { text: 'Open in text editor', onClick: handleOpenJsonLinesText },
      { text: 'Delete', onClick: handleDelete },
      { text: 'Rename', onClick: handleRename },
      data.fileType == 'jsonl' &&
        createQuickExportMenu(
          fmt => async () => {
            exportQuickExportFile(
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
          },
          {
            text: 'Export',
            onClick: () => {
              openImportExportTab({
                sourceStorageType: 'archive',
                sourceArchiveFolder: data.folderName,
                sourceList: [data.fileName],
              });

              // showModal(ImportExportModal, {
              //   initialValues: {
              //     sourceStorageType: 'archive',
              //     sourceArchiveFolder: data.folderName,
              //     sourceList: [data.fileName],
              //   },
              // });
            },
          }
        ),
      data.fileType.endsWith('.sql') && { text: 'Open SQL', onClick: handleOpenSqlFile },
      data.fileType.endsWith('.yaml') && { text: 'Open YAML', onClick: handleOpenYamlFile },
      data.fileType == 'jsonl' && {
        text: 'Open in profiler',
        submenu: getExtensions()
          .drivers.filter(eng => eng.profilerFormatterFunction)
          .map(eng => ({
            text: eng.title,
            onClick: () => {
              openNewTab({
                title: 'Profiler',
                icon: 'img profiler',
                tabComponent: 'ProfilerTab',
                props: {
                  jslidLoad: `archive://${data.folderName}/${data.fileName}`,
                  engine: eng.engine,
                  // profilerFormatterFunction: eng.profilerFormatterFunction,
                  // profilerTimestampFunction: eng.profilerTimestampFunction,
                  // profilerChartAggregateFunction: eng.profilerChartAggregateFunction,
                  // profilerChartMeasures: eng.profilerChartMeasures,
                },
              });
            },
          })),
      },
    ];
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.fileLabel}
  icon={getArchiveIcon(data)}
  menu={createMenu}
  on:click={handleClick}
/>
