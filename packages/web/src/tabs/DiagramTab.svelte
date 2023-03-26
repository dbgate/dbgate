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
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import { registerFileCommands } from '../commands/stdCommands';
  import createUndoReducer from '../utility/createUndoReducer';
  import _ from 'lodash';
  import { findEngineDriver } from 'dbgate-tools';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import DiagramDesigner from '../designer/DiagramDesigner.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import ToolStripSaveButton from '../buttons/ToolStripSaveButton.svelte';
  import VerticalSplitter from "../elements/VerticalSplitter.svelte";

  export let tabid;
  export let conid;
  export let database;
  export let initialArgs;

  export const activator = createActivator('DiagramTab', true);

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
    invalidateCommands();
  }

  export function canRedo() {
    return $modelState.canRedo;
  }

  export function redo() {
    dispatchModel({ type: 'redo' });
    invalidateCommands();
  }

  const handleChange = (value, skipUndoChain) => {
    // @ts-ignore
    dispatchModel({
      type: 'compute',
      useMerge: skipUndoChain,
      compute: v => (_.isFunction(value) ? value(v) : value),
    });
    invalidateCommands();
  };

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    onInitialData: value => {
      dispatchModel({ type: 'reset', value });
      invalidateCommands();
    },
  });

  const [modelState, dispatchModel] = createUndoReducer({
    tables: [],
    references: [],
  });

  function createMenu() {
    return [
      { command: 'diagram.save' },
      { command: 'diagram.saveAs' },
      { command: 'designer.arrange' },
      { command: 'diagram.export' },
      { divider: true },
      { command: 'diagram.undo' },
      { command: 'diagram.redo' },
    ];
  }
</script>

<ToolStripContainer>
  <VerticalSplitter isSplitter={false}>
    <svelte:fragment slot="1">
      <DiagramDesigner value={$modelState.value || {}} {conid} {database} onChange={handleChange} menu={createMenu} />
    </svelte:fragment>
  </VerticalSplitter>
  
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="designer.arrange" />
    <ToolStripSaveButton idPrefix="diagram" />
    <ToolStripCommandButton command="diagram.export" />
    <ToolStripCommandButton command="diagram.undo" />
    <ToolStripCommandButton command="diagram.redo" />
  </svelte:fragment>
</ToolStripContainer>
