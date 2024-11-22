<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('JsonEditorTab');

  registerFileCommands({
    idPrefix: 'json',
    category: 'Json',
    getCurrentEditor,
    folder: 'yaml',
    format: 'text',
    fileExtension: 'json',

    toggleComment: true,
    findReplace: true,
  });
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import { registerFileCommands } from '../commands/stdCommands';

  import AceEditor from '../query/AceEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import invalidateCommands from '../commands/invalidateCommands';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripSaveButton from '../buttons/ToolStripSaveButton.svelte';

  export let tabid;

  const tabFocused: any = getContext('tabFocused');

  export const activator = createActivator('JsonEditorTab', false);

  let domEditor;
  let domToolStrip;

  $: if ($tabFocused && domEditor) {
    domEditor?.getEditor()?.focus();
  }

  export function getData() {
    return $editorState.value || '';
  }

  export function toggleComment() {
    domEditor.getEditor().execCommand('togglecomment');
  }

  export function find() {
    domEditor.getEditor().execCommand('find');
  }

  export function replace() {
    domEditor.getEditor().execCommand('replace');
  }

  export function getTabId() {
    return tabid;
  }

  const { editorState, editorValue, setEditorData, saveToStorage } = useEditorData({ tabid });

  function createMenu() {
    return [
      { command: 'json.toggleComment' },
      { divider: true },
      { command: 'json.save' },
      { command: 'json.saveAs' },
      { divider: true },
      { command: 'json.find' },
      { command: 'json.replace' },
    ];
  }
</script>

<ToolStripContainer bind:this={domToolStrip}>
  <AceEditor
    value={$editorState.value || ''}
    menu={createMenu()}
    on:input={e => setEditorData(e.detail)}
    on:focus={() => {
      activator.activate();
      domToolStrip?.activate();
      invalidateCommands();
    }}
    bind:this={domEditor}
    mode="json"
  />

  <svelte:fragment slot="toolstrip">
    <ToolStripSaveButton idPrefix="json" />
  </svelte:fragment>
</ToolStripContainer>
