<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('FreeTableTab');

  registerCommand({
    id: 'freeTable.save',
    group: 'save',
    category: 'Table data',
    name: 'Save',
    // keyText: 'Ctrl+S',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().save(),
  });
</script>

<script lang="ts">
  import { createFreeTableModel, FreeTableGridDisplay, runMacro } from 'dbgate-datalib';
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import DataGrid from '../datagrid/DataGrid.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import FreeTableGridCore from '../freetable/FreeTableGridCore.svelte';
  import { showModal } from '../modals/modalTools';
  import SaveArchiveModal from '../modals/SaveArchiveModal.svelte';
  import useEditorData from '../query/useEditorData';
  import axiosInstance from '../utility/axiosInstance';
  import { changeTab } from '../utility/common';
  import { registerMenu } from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createUndoReducer from '../utility/createUndoReducer';
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
    loadFromArgs:
      initialArgs && initialArgs.functionName
        ? () => axiosInstance.post('runners/load-reader', initialArgs).then(x => x.data)
        : null,
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
    await axiosInstance.post('archive/save-free-table', { folder, file, data: $modelState.value });
    changeTab(tabid, tab => ({
      ...tab,
      title: file,
      props: { archiveFile: file, archiveFolder: folder },
    }));
  };

  function handleRunMacro(macro, params, cells) {
    const newModel = runMacro(macro, params, $modelState.value, false, cells);
    dispatchModel({ type: 'set', value: newModel });
  }

  const collapsedLeftColumnStore = writable(false);
  setContext('collapsedLeftColumnStore', collapsedLeftColumnStore);

  registerMenu({ command: 'freeTable.save', tag: 'save' });

  // display is overridden in FreeTableGridCore, this is because of column manager
  $: display = new FreeTableGridDisplay($modelState.value, $config, config.update, null, null);
</script>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{:else if errorMessage}
  <ErrorInfo message={errorMessage} />
{:else}
  <DataGrid
    config={$config}
    setConfig={config.update}
    modelState={$modelState}
    {dispatchModel}
    focusOnVisible
    gridCoreComponent={FreeTableGridCore}
    freeTableColumn
    showMacros
    onRunMacro={handleRunMacro}
    isDynamicStructure={$modelState.value?.structure?.__isDynamicStructure}
    {display}
  />
{/if}
