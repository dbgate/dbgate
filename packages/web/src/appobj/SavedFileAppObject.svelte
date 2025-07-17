<script lang="ts" context="module">
  import { filterName, getConnectionLabel, getSqlFrontMatter } from 'dbgate-tools';
  import yaml from 'js-yaml';

  interface FileTypeHandler {
    icon: string;
    format: string;
    tabComponent: string;
    folder: string;
    currentConnection: boolean;
    extension: string;
    label: string;
    switchDatabaseOnOpen?: (data: any) => Promise<boolean>;
  }

  const sql: FileTypeHandler = {
    icon: 'img sql-file',
    format: 'text',
    tabComponent: 'QueryTab',
    folder: 'sql',
    currentConnection: true,
    extension: 'sql',
    label: 'SQL file',
    switchDatabaseOnOpen: async data => {
      const frontMatter = getSqlFrontMatter(data, yaml);
      if (frontMatter?.connectionId) {
        const connection = await getConnectionInfo({ conid: frontMatter.connectionId });
        // console.log('Switching database to', frontMatter.databaseName, 'on connection', connection);
        if (connection && frontMatter.databaseName) {
          currentDatabase.set({
            connection,
            name: frontMatter.databaseName,
          });
          return true;
        }
      }
      return false;
    },
  };

  const shell: FileTypeHandler = {
    icon: 'img shell',
    format: 'text',
    tabComponent: 'ShellTab',
    folder: 'shell',
    currentConnection: false,
    extension: 'js',
    label: 'JavaScript Shell script',
  };

  const markdown: FileTypeHandler = {
    icon: 'img markdown',
    format: 'text',
    tabComponent: 'MarkdownEditorTab',
    folder: 'markdown',
    currentConnection: false,
    extension: 'md',
    label: 'Markdown file',
  };

  const query: FileTypeHandler = {
    icon: 'img query-design',
    format: 'json',
    tabComponent: 'QueryDesignTab',
    folder: 'query',
    currentConnection: true,
    extension: 'json',
    label: 'Query design file',
  };

  const sqlite: FileTypeHandler = {
    icon: 'img sqlite-database',
    format: 'binary',
    tabComponent: null,
    folder: 'sqlite',
    currentConnection: true,
    extension: 'sqlite',
    label: 'SQLite database',
  };

  const diagrams: FileTypeHandler = {
    icon: 'img diagram',
    format: 'json',
    tabComponent: 'DiagramTab',
    folder: 'diagrams',
    currentConnection: true,
    extension: 'json',
    label: 'Diagram file',
  };

  const impexp: FileTypeHandler = {
    icon: 'img export',
    format: 'json',
    tabComponent: 'ImportExportTab',
    folder: 'impexp',
    currentConnection: false,
    extension: 'json',
    label: 'Import/Export file',
  };

  const datadeploy: FileTypeHandler = isProApp()
    ? {
        icon: 'img data-deploy',
        format: 'json',
        tabComponent: 'DataDeployTab',
        folder: 'datadeploy',
        currentConnection: false,
        extension: 'json',
        label: 'Data deploy file',
      }
    : undefined;

  const dbcompare: FileTypeHandler = isProApp()
    ? {
        icon: 'img compare',
        format: 'json',
        tabComponent: 'CompareModelTab',
        folder: 'dbcompare',
        currentConnection: false,
        extension: 'json',
        label: 'Database compare file',
      }
    : undefined;

  const perspectives: FileTypeHandler = {
    icon: 'img perspective',
    format: 'json',
    tabComponent: 'PerspectiveTab',
    folder: 'pesrpectives',
    currentConnection: true,
    extension: 'json',
    label: 'Perspective file',
  };

  const modtrans: FileTypeHandler = {
    icon: 'img transform',
    format: 'text',
    tabComponent: 'ModelTransformTab',
    folder: 'modtrans',
    currentConnection: false,
    extension: 'json',
    label: 'Model transform file',
  };

  export const SAVED_FILE_HANDLERS = {
    sql,
    shell,
    markdown,
    query,
    sqlite,
    diagrams,
    perspectives,
    impexp,
    modtrans,
    datadeploy,
    dbcompare,
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
  import { isProApp } from '../utility/proTools';
  import { saveFileToDisk } from '../utility/exportFileTools';
  import { getConnectionInfo } from '../utility/metadataLoaders';

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
      { text: 'Download', onClick: handleDownload },
    ];
  }

  const handleDelete = () => {
    showModal(ConfirmModal, {
      message: `Really delete file ${data.file}?`,
      onConfirm: () => {
        if (data.folid && data.cntid) {
          apiCall('cloud/delete-content', {
            folid: data.folid,
            cntid: data.cntid,
          });
        } else {
          apiCall('files/delete', data);
        }
      },
    });
  };

  const handleRename = () => {
    showModal(InputTextModal, {
      value: data.file,
      label: 'New file name',
      header: 'Rename file',
      onConfirm: newFile => {
        if (data.folid && data.cntid) {
          apiCall('cloud/rename-content', {
            folid: data.folid,
            cntid: data.cntid,
            name: newFile,
          });
        } else {
          apiCall('files/rename', { ...data, newFile });
        }
      },
    });
  };

  const handleCopy = () => {
    showModal(InputTextModal, {
      value: data.file,
      label: 'New file name',
      header: 'Copy file',
      onConfirm: newFile => {
        if (data.folid && data.cntid) {
          apiCall('cloud/copy-file', {
            folid: data.folid,
            cntid: data.cntid,
            name: newFile,
          });
        } else {
          apiCall('files/copy', { ...data, newFile });
        }
      },
    });
  };

  const handleDownload = () => {
    saveFileToDisk(
      async filePath => {
        if (data.folid && data.cntid) {
          await apiCall('cloud/export-file', {
            folid: data.folid,
            cntid: data.cntid,
            filePath,
          });
        } else {
          await apiCall('files/export-file', {
            folder,
            file: data.file,
            filePath,
          });
        }
      },
      { formatLabel: handler.label, formatExtension: handler.format, defaultFileName: data.file }
    );
  };

  async function openTab() {
    let dataContent;
    if (data.folid && data.cntid) {
      const resp = await apiCall('cloud/get-content', {
        folid: data.folid,
        cntid: data.cntid,
      });
      dataContent = resp.content;
    } else {
      dataContent = await apiCall('files/load', { folder, file: data.file, format: handler.format });
    }

    let tooltip = undefined;
    const connProps: any = {};

    if (handler.switchDatabaseOnOpen) {
      await handler.switchDatabaseOnOpen(dataContent);
    }

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
          savedCloudFolderId: data.folid,
          savedCloudContentId: data.cntid,
          ...connProps,
        },
      },
      { editor: dataContent }
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
