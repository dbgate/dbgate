<script lang="ts" context="module">
  import { filterName, getConnectionLabel } from 'dbgate-tools';

  interface FileTypeHandler {
    icon: string;
    format: string;
    tabComponent: string;
    folder: string;
    currentConnection: boolean;
  }

  const sql: FileTypeHandler = {
    icon: 'img sql-file',
    format: 'text',
    tabComponent: 'QueryTab',
    folder: 'sql',
    currentConnection: true,
  };

  const shell: FileTypeHandler = {
    icon: 'img shell',
    format: 'text',
    tabComponent: 'ShellTab',
    folder: 'shell',
    currentConnection: false,
  };

  const markdown: FileTypeHandler = {
    icon: 'img markdown',
    format: 'text',
    tabComponent: 'MarkdownEditorTab',
    folder: 'markdown',
    currentConnection: false,
  };

  const charts: FileTypeHandler = {
    icon: 'img chart',
    format: 'json',
    tabComponent: 'ChartTab',
    folder: 'charts',
    currentConnection: true,
  };

  const query: FileTypeHandler = {
    icon: 'img query-design',
    format: 'json',
    tabComponent: 'QueryDesignTab',
    folder: 'query',
    currentConnection: true,
  };

  const sqlite: FileTypeHandler = {
    icon: 'img sqlite-database',
    format: 'binary',
    tabComponent: null,
    folder: 'sqlite',
    currentConnection: true,
  };

  const diagrams: FileTypeHandler = {
    icon: 'img diagram',
    format: 'json',
    tabComponent: 'DiagramTab',
    folder: 'diagrams',
    currentConnection: true,
  };

  const jobs: FileTypeHandler = {
    icon: 'img export',
    format: 'json',
    tabComponent: 'ImportExportTab',
    folder: 'jobs',
    currentConnection: false,
  };

  const perspectives: FileTypeHandler = {
    icon: 'img perspective',
    format: 'json',
    tabComponent: 'PerspectiveTab',
    folder: 'pesrpectives',
    currentConnection: true,
  };

  const modtrans: FileTypeHandler = {
    icon: 'img transform',
    format: 'text',
    tabComponent: 'ModelTransformTab',
    folder: 'modtrans',
    currentConnection: false,
  };

  export const SAVED_FILE_HANDLERS = {
    sql,
    shell,
    markdown,
    charts,
    query,
    sqlite,
    diagrams,
    perspectives,
    jobs,
    modtrans,
  };

  export const extractKey = data => data.file;
  export const createMatcher =
    filter =>
    ({ file }) =>
      filterName(filter, file);
</script>

<script lang="ts">
  import _ from 'lodash';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { showModal } from '../modals/modalTools';

  import { currentDatabase } from '../stores';
  import { apiCall } from '../utility/api';

  import hasPermission from '../utility/hasPermission';
  import openNewTab from '../utility/openNewTab';

  import AppObjectCore from './AppObjectCore.svelte';

  export let data;

  $: folder = data?.folder;
  $: handler = SAVED_FILE_HANDLERS[folder] as FileTypeHandler;

  const showMarkdownPage = () => {
    openNewTab({
      title: data.file,
      icon: 'img markdown',
      tabComponent: 'MarkdownViewTab',
      props: {
        savedFile: data.file,
        savedFolder: 'markdown',
        savedFormat: 'text',
      },
    });
  };

  function createMenu() {
    return [
      handler?.tabComponent && { text: 'Open', onClick: openTab },
      hasPermission(`files/${data.folder}/write`) && { text: 'Rename', onClick: handleRename },
      hasPermission(`files/${data.folder}/write`) && { text: 'Create copy', onClick: handleCopy },
      hasPermission(`files/${data.folder}/write`) && { text: 'Delete', onClick: handleDelete },
      folder == 'markdown' && { text: 'Show page', onClick: showMarkdownPage },
    ];
  }

  const handleDelete = () => {
    showModal(ConfirmModal, {
      message: `Really delete file ${data.file}?`,
      onConfirm: () => {
        apiCall('files/delete', data);
      },
    });
  };

  const handleRename = () => {
    showModal(InputTextModal, {
      value: data.file,
      label: 'New file name',
      header: 'Rename file',
      onConfirm: newFile => {
        apiCall('files/rename', { ...data, newFile });
      },
    });
  };

  const handleCopy = () => {
    showModal(InputTextModal, {
      value: data.file,
      label: 'New file name',
      header: 'Rename file',
      onConfirm: newFile => {
        apiCall('files/copy', { ...data, newFile });
      },
    });
  };

  async function openTab() {
    const resp = await apiCall('files/load', { folder, file: data.file, format: handler.format });

    const connProps: any = {};
    let tooltip = undefined;

    if (handler.currentConnection) {
      const connection = _.get($currentDatabase, 'connection') || {};
      const database = _.get($currentDatabase, 'name');
      connProps.conid = connection._id;
      connProps.database = database;
      tooltip = `${getConnectionLabel(connection)}\n${database}`;
    }

    openNewTab(
      {
        title: data.file,
        icon: handler.icon,
        tabComponent: handler.tabComponent,
        tooltip,
        props: {
          savedFile: data.file,
          savedFolder: handler.folder,
          savedFormat: handler.format,
          ...connProps,
        },
      },
      { editor: resp }
    );
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  icon={handler?.icon}
  title={data?.file}
  menu={createMenu()}
  on:click={handler?.tabComponent && openTab}
/>
