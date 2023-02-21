<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('FreeTableTab');

  registerCommand({
    id: 'freeTable.save',
    group: 'save',
    category: 'Table data',
    name: 'Save',
    // keyText: 'CtrlOrCommand+S',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().save(),
  });

  registerCommand({
    id: 'freeTable.toggleDynamicStructure',
    category: 'Table data',
    name: 'Toggle dynamic structure',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().toggleDynamicStructure(),
  });
</script>

<script lang="ts">
  import {
    analyseCollectionDisplayColumns,
    createFreeTableModel,
    FreeTableGridDisplay,
    runMacro,
  } from 'dbgate-datalib';
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';
  import registerCommand from '../commands/registerCommand';
  import DataGrid from '../datagrid/DataGrid.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import FreeTableGridCore from '../freetable/FreeTableGridCore.svelte';
  import { showModal } from '../modals/modalTools';
  import SaveArchiveModal from '../modals/SaveArchiveModal.svelte';
  import useEditorData from '../query/useEditorData';
  import { apiCall } from '../utility/api';
  import { changeTab } from '../utility/common';
  import { registerMenu } from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createUndoReducer from '../utility/createUndoReducer';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import useGridConfig from '../utility/useGridConfig';

  export let tabid;
  export let initialArgs;
  export let archiveFolder;
  export let archiveFile;

  export const activator = createActivator('FreeTableTab', true);

  const config = useGridConfig(tabid);
  const [modelState, dispatchModel] = createUndoReducer(createFreeTableModel());

  const { setEditorData, editorState } = useEditorData({
    tabid,
    loadFromArgs: initialArgs && initialArgs.functionName ? () => apiCall('runners/load-reader', initialArgs) : null,
    onInitialData: value => {
      dispatchModel({ type: 'reset', value });
    },
  });

  $: isLoading = $editorState.isLoading;
  $: errorMessage = $editorState.errorMessage;

  $: setEditorData($modelState.value);

  export function save() {
    showModal(SaveArchiveModal, {
      folder: archiveFolder,
      file: archiveFile,
      onSave: doSave,
    });
  }

  const doSave = async (folder, file) => {
    await apiCall('archive/save-free-table', { folder, file, data: $modelState.value });
    changeTab(tabid, tab => ({
      ...tab,
      title: file,
      props: { archiveFile: file, archiveFolder: folder },
      archiveFile: file,
      archiveFolder: folder,
    }));
    archiveFile = file;
    archiveFolder = folder;
  };

  function handleRunMacro(macro, params, cells) {
    const newModel = runMacro(macro, params, $modelState.value, false, cells);
    dispatchModel({ type: 'set', value: newModel });
  }

  const collapsedLeftColumnStore = writable(getLocalStorage('freeTable_collapsedLeftColumn', false));
  setContext('collapsedLeftColumnStore', collapsedLeftColumnStore);
  $: setLocalStorage('freeTable_collapsedLeftColumn', $collapsedLeftColumnStore);

  export function toggleDynamicStructure() {
    let structure = $modelState.value.structure;
    structure = { ...structure, __isDynamicStructure: !structure.__isDynamicStructure };
    if (!structure.__isDynamicStructure) {
      const columns = analyseCollectionDisplayColumns($modelState.value.rows, display);
      structure = {
        ...structure,
        columns: columns
          .filter(col => col.uniquePath.length == 1)
          .map(col => ({
            columnName: col.uniqueName,
          })),
      };
    }
    dispatchModel({
      type: 'set',
      value: {
        ...$modelState.value,
        structure,
      },
    });
  }

  registerMenu(
    { command: 'freeTable.save', tag: 'save' },
    { command: 'freeTable.toggleDynamicStructure', tag: 'export' }
  );

  // display is overridden in FreeTableGridCore, this is because of column manager
  $: display = new FreeTableGridDisplay($modelState.value, $config, config.update, null, null);

  const quickExportHandlerRef = createQuickExportHandlerRef();
</script>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{:else if errorMessage}
  <ErrorInfo message={errorMessage} />
{:else}
  <ToolStripContainer>
    <DataGrid
      config={$config}
      setConfig={config.update}
      modelState={$modelState}
      {dispatchModel}
      focusOnVisible
      gridCoreComponent={FreeTableGridCore}
      freeTableColumn
      showMacros
      expandMacros
      onRunMacro={handleRunMacro}
      isDynamicStructure={$modelState.value?.structure?.__isDynamicStructure}
      {display}
    />
    <svelte:fragment slot="toolstrip">
      <ToolStripCommandButton command="freeTable.save" />
      <ToolStripExportButton command="freeTableGrid.export" {quickExportHandlerRef} />
    </svelte:fragment>
  </ToolStripContainer>
{/if}
