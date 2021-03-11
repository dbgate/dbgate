<script lang="ts" context="module">
  const lastFocusedEditor = writable(null);
  const currentEditor = derived([lastFocusedEditor, activeTabId], ([editor, tabid]) =>
    editor?.getTabId() == tabid ? editor : null
  );

  registerFileCommands({
    idPrefix: 'markdown',
    category: 'Markdown',
    editorStore: currentEditor,
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
    enabledStore: derived(currentEditor, query => query != null),
    onClick: () => (get(currentEditor) as any).preview(),
  });
</script>

<script lang="ts">
  import { get_current_component } from 'svelte/internal';
  import { getContext } from 'svelte';
  import { get, derived, writable } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import { registerFileCommands } from '../commands/stdCommands';

  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import RunnerOutputPane from '../query/RunnerOutputPane.svelte';
  import useEditorData from '../query/useEditorData';
  import { activeTabId, nullStore } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import memberStore from '../utility/memberStore';
  import socket from '../utility/socket';
  import useEffect from '../utility/useEffect';

  export let tabid;

  const tabVisible: any = getContext('tabVisible');

  let runnerId;

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
  on:focus={() => lastFocusedEditor.set(instance)}
  bind:this={domEditor}
  mode="markdown"
/>
