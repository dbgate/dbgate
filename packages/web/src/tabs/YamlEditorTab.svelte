<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('YamlEditorTab');

  registerFileCommands({
    idPrefix: 'yaml',
    category: 'Yaml',
    getCurrentEditor,
    folder: 'yaml',
    format: 'text',
    fileExtension: 'yaml',

    toggleComment: true,
    findReplace: true,
  });
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import registerCommand from '../commands/registerCommand';
  import { registerFileCommands } from '../commands/stdCommands';

  import AceEditor from '../query/AceEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { openedTabs } from '../stores';
  import invalidateCommands from '../commands/invalidateCommands';
  import openNewTab from '../utility/openNewTab';
  import { setSelectedTab } from '../utility/common';
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  export let tabid;

  const tabFocused: any = getContext('tabFocused');

  export const activator = createActivator('YamlEditorTab', false);

  let domEditor;

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
      { command: 'yaml.toggleComment' },
      { divider: true },
      { command: 'yaml.save' },
      { command: 'yaml.saveAs' },
      { divider: true },
      { command: 'yaml.find' },
      { command: 'yaml.replace' },
    ];
  }
</script>

<AceEditor
  value={$editorState.value || ''}
  menu={createMenu()}
  on:input={e => setEditorData(e.detail)}
  on:focus={() => {
    activator.activate();
    invalidateCommands();
  }}
  bind:this={domEditor}
  mode="yaml"
/>
