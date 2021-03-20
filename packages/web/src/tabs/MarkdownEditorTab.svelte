<script lang="ts" context="module">
  let lastFocusedEditor = null;
  const getCurrentEditor = () =>
    lastFocusedEditor?.getTabId && lastFocusedEditor?.getTabId() == getActiveTabId() ? lastFocusedEditor : null;

  registerFileCommands({
    idPrefix: 'markdown',
    category: 'Markdown',
    getCurrentEditor,
    folder: 'markdown',
    format: 'text',
    fileExtension: 'md',

    toggleComment: true,
    findReplace: true,
  });

  registerCommand({
    id: 'markdown.preview',
    category: 'Markdown',
    name: 'Preview',
    icon: 'icon run',
    toolbar: true,
    keyText: 'F5 | Ctrl+Enter',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().preview(),
  });
</script>

<script lang="ts">
  import { get_current_component } from 'svelte/internal';
  import { getContext } from 'svelte';
  import registerCommand from '../commands/registerCommand';
  import { registerFileCommands } from '../commands/stdCommands';

  import AceEditor from '../query/AceEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { getActiveTabId } from '../stores';
  import invalidateCommands from '../commands/invalidateCommands';

  export let tabid;

  const tabVisible: any = getContext('tabVisible');

  const instance = get_current_component();

  let domEditor;

  $: if ($tabVisible && domEditor) {
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

  const { editorState, editorValue, setEditorData } = useEditorData({ tabid });

  function createMenu() {
    return [
      { command: 'markdown.preview' },
      { divider: true },
      { command: 'markdown.toggleComment' },
      { divider: true },
      { command: 'markdown.save' },
      { command: 'markdown.saveAs' },
      { divider: true },
      { command: 'markdown.find' },
      { command: 'markdown.replace' },
    ];
  }
</script>

<AceEditor
  value={$editorState.value || ''}
  menu={createMenu()}
  on:input={e => setEditorData(e.detail)}
  on:focus={() => {
    lastFocusedEditor = instance;
    invalidateCommands();
  }}
  bind:this={domEditor}
  mode="markdown"
/>
