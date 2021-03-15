<script lang="ts">
  import { createFreeTableModel } from 'dbgate-datalib';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import FreeTableGrid from '../freetable/FreeTableGrid.svelte';
  import { showModal } from '../modals/modalTools';
  import SaveArchiveModal from '../modals/SaveArchiveModal.svelte';
  import useEditorData from '../query/useEditorData';
  import axiosInstance from '../utility/axiosInstance';
  import { changeTab } from '../utility/common';
  import createUndoReducer from '../utility/createUndoReducer';
  import useGridConfig from '../utility/useGridConfig';

  export let tabid;
  export let initialArgs;
  export let archiveFolder;
  export let archiveFile;

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

  function handleSave() {
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
</script>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{:else if errorMessage}
  <ErrorInfo message={errorMessage} />
{:else}
  <FreeTableGrid
    config={$config}
    setConfig={config.update}
    modelState={$modelState}
    {dispatchModel}
    onSave={handleSave}
    focusOnVisible
  />
{/if}
