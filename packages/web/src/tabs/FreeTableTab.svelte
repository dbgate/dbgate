<script lang="ts">
  import { createFreeTableModel } from 'dbgate-datalib';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import FreeTableGrid from '../freetable/FreeTableGrid.svelte';
  import useEditorData from '../query/useEditorData';
  import axiosInstance from '../utility/axiosInstance';
  import createUndoReducer from '../utility/createUndoReducer';
  import useGridConfig from '../utility/useGridConfig';

  export let tabid;
  export let initialArgs;

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

  function handleSave() {}
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
  />
{/if}
