<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('PerspectiveTab');

  registerCommand({
    id: 'perspective.refresh',
    category: 'Perspective',
    name: 'Refresh',
    keyText: 'F5 | CtrlOrCommand+R',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon reload',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().refresh(),
  });

  registerFileCommands({
    idPrefix: 'perspective',
    category: 'Perspective',
    getCurrentEditor,
    folder: 'perspectives',
    format: 'json',
    fileExtension: 'perspective',

    undoRedo: true,
  });

  export const allowAddToFavorites = props => true;
</script>

<script lang="ts">
  import { createPerspectiveConfig, PerspectiveCache } from 'dbgate-datalib';

  import PerspectiveView from '../perspectives/PerspectiveView.svelte';
  import { writable } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import { findEngineDriver } from 'dbgate-tools';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import { extensions } from '../stores';
  import invalidateCommands from '../commands/invalidateCommands';
  import useEditorData from '../query/useEditorData';
  import createUndoReducer from '../utility/createUndoReducer';
  import { registerFileCommands } from '../commands/stdCommands';
  import _ from 'lodash';
  import ToolStripSaveButton from '../buttons/ToolStripSaveButton.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  export const activator = createActivator('PerspectiveTab', true);

  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);

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

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    onInitialData: value => {
      dispatchModel({ type: 'reset', value });
      invalidateCommands();
    },
  });

  const [modelState, dispatchModel] = createUndoReducer(
    createPerspectiveConfig({
      schemaName,
      pureName,
    })
  );

  const cache = new PerspectiveCache();
  const loadedCounts = writable({});

  export function refresh() {
    cache.clear();
    loadedCounts.set({});
  }
</script>

<ToolStripContainer>
  <PerspectiveView
    {conid}
    {database}
    {driver}
    config={$modelState.value}
    setConfig={(value, reload) => {
      if (reload) {
        cache.clear();
      }
      dispatchModel({
        type: 'compute',
        // useMerge: skipUndoChain,
        compute: v => (_.isFunction(value) ? value(v) : value),
      });
      invalidateCommands();

      // config.update(value);
      // loadedCounts.set({});
    }}
    {cache}
    {loadedCounts}
  />

  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton
      command="designer.arrange"
      buttonLabel={$modelState.value?.isArranged ? '(Arranged)' : 'Arrange'}
    />
    <ToolStripCommandButton command="perspective.refresh" />
    <ToolStripCommandButton command="perspective.customJoin" />
    <ToolStripSaveButton idPrefix="perspective" />
    <ToolStripCommandButton command="perspective.undo" />
    <ToolStripCommandButton command="perspective.redo" />
  </svelte:fragment>
</ToolStripContainer>
