<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('DiagramTab');

  registerFileCommands({
    idPrefix: 'diagram',
    category: 'Diagram',
    getCurrentEditor,
    folder: 'diagrams',
    format: 'json',
    fileExtension: 'diagram',

    undoRedo: true,
  });
</script>

<script lang="ts">
  import useEditorData from '../query/useEditorData';
  import { extensions } from '../stores';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import { registerFileCommands } from '../commands/stdCommands';
  import createUndoReducer from '../utility/createUndoReducer';
  import _ from 'lodash';
  import { findEngineDriver } from 'dbgate-tools';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import Designer from '../designer/Designer.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let initialArgs;

  export const activator = createActivator('DiagramTab', true);

  $: connection = useConnectionInfo({ conid });
  $: engine = findEngineDriver($connection, $extensions);

  $: setEditorData($modelState.value);

  export function getTabId() {
    return tabid;
  }

  export function getData() {
    return $editorState.value || '';
  }

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

  const handleChange = (value, skipUndoChain) =>
    // @ts-ignore
    dispatchModel({
      type: 'compute',
      useMerge: skipUndoChain,
      compute: v => (_.isFunction(value) ? value(v) : value),
    });

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

  function createMenu() {
    return [
      { command: 'diagram.save' },
      { command: 'diagram.saveAs' },
      { divider: true },
      { command: 'diagram.undo' },
      { command: 'diagram.redo' },
    ];
  }
</script>

<Designer
  value={$modelState.value || {}}
  {conid}
  {database}
  onChange={handleChange}
  menu={createMenu}
/>
