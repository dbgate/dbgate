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
  import { registerFileCommands } from '../commands/stdCommands';
  import createUndoReducer from '../utility/createUndoReducer';
  import _ from 'lodash';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import DiagramDesigner from '../designer/DiagramDesigner.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import ToolStripSaveButton from '../buttons/ToolStripSaveButton.svelte';
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import DiagramSettings from '../designer/DiagramSettings.svelte';
  import { derived } from 'svelte/store';

  export let tabid;
  export let conid;
  export let database;

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

  const setStyle = style =>
    // @ts-ignore
    dispatchModel({
      type: 'compute',
      compute: v => ({ ...v, style: _.isFunction(style) ? style(v.style) : style }),
    });

  const styleDerivedStore = derived(modelState, ($modelState: any) =>
    $modelState.value ? $modelState.value.style || {} : {}
  );
  const styleStore = {
    ...styleDerivedStore,
    update: setStyle,
    set: setStyle,
  };

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

  $: console.log('$styleStore', $styleStore);
</script>

<ToolStripContainer>
  <HorizontalSplitter isSplitter={$styleStore.settingsVisible ?? true} initialSizeRight={300}>
    <svelte:fragment slot="1">
      <DiagramDesigner value={$modelState.value || {}} {conid} {database} onChange={handleChange} menu={createMenu} />
    </svelte:fragment>
    <svelte:fragment slot="2">
      <WidgetColumnBar>
        <WidgetColumnBarItem
          title="Settings"
          name="diagramSettings"
          storageName="diagramSettingsWidget"
          onClose={() => {
            styleStore.update(x => ({ ...x, settingsVisible: false }));
          }}
        >
          <WidgetsInnerContainer skipDefineWidth>
            <DiagramSettings values={styleStore} />
          </WidgetsInnerContainer>
        </WidgetColumnBarItem>
      </WidgetColumnBar>
    </svelte:fragment>
  </HorizontalSplitter>

  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="designer.arrange" />
    <ToolStripSaveButton idPrefix="diagram" />
    <ToolStripCommandButton command="diagram.export" />
    <ToolStripCommandButton command="diagram.undo" />
    <ToolStripCommandButton command="diagram.redo" />
    <ToolStripButton
      icon="icon settings"
      on:click={() => {
        styleStore.update(x => ({ ...x, settingsVisible: !x.settingsVisible }));
      }}>Settings</ToolStripButton
    >
  </svelte:fragment>
</ToolStripContainer>
