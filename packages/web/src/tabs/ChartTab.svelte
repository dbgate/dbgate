<script lang="ts">
  import _ from 'lodash';
  import { derived } from 'svelte/store';
  import ChartEditor from '../charts/ChartEditor.svelte';

  import ErrorInfo from '../elements/ErrorInfo.svelte';

  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import useEditorData from '../query/useEditorData';
  import createUndoReducer from '../utility/createUndoReducer';

  export let tabid;
  export let conid;
  export let database;

  export function getData() {
    return $editorState.value || '';
  }

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    onInitialData: value => {
      dispatchModel({ type: 'reset', value });
    },
  });

  const [modelState, dispatchModel] = createUndoReducer({
    tables: [],
    references: [],
    columns: [],
  });

  $: setEditorData($modelState.value);

  const setConfig = config =>
    // @ts-ignore
    dispatchModel({
      type: 'compute',
      compute: v => ({ ...v, config: _.isFunction(config) ? config(v.config) : config }),
    });

  const configDerivedStore = derived(modelState, ($modelState: any) =>
    $modelState.value ? $modelState.value.config || {} : {}
  );
  const configStore = {
    ...configDerivedStore,
    update: setConfig,
    set: setConfig,
  };
</script>

{#if $editorState.isLoading}
  <LoadingInfo wrapper message="Loading data" />
{:else if $editorState.errorMessage}
  <ErrorInfo message={$editorState.errorMessage} />
{:else}
  <ChartEditor
    data={$modelState.value && $modelState.value.data}
    {configStore}
    sql={$modelState.value && $modelState.value.sql}
    {conid}
    {database}
  />
{/if}
