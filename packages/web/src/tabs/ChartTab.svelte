<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('ChartTab');

  registerFileCommands({
    idPrefix: 'chart',
    category: 'Chart',
    getCurrentEditor,
    folder: 'charts',
    format: 'json',
    fileExtension: 'chart',

    undoRedo: true,
  });
</script>

<script lang="ts">
  import _ from 'lodash';
  import { derived } from 'svelte/store';
  import ChartEditor from '../charts/ChartEditor.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import { registerFileCommands } from '../commands/stdCommands';

  import ErrorInfo from '../elements/ErrorInfo.svelte';

  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import useEditorData from '../query/useEditorData';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createUndoReducer from '../utility/createUndoReducer';

  export let tabid;
  export let conid;
  export let database;

  export const activator = createActivator('ChartTab', true);

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

  $: {
    $modelState;
    invalidateCommands();
  }

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

  export function canUndo() {
    return $modelState.canUndo;
  }

  export function undo() {
    dispatchModel({ type: 'undo' });
  }

  export function canRedo() {
    return $modelState.canRedo;
  }

  export function redo() {
    dispatchModel({ type: 'redo' });
  }

  function createMenu() {
    return [
      { command: 'chart.save' },
      { command: 'chart.saveAs' },
      { divider: true },
      { command: 'chart.undo' },
      { command: 'chart.redo' },
    ];
  }
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
    menu={createMenu}
  />
{/if}
