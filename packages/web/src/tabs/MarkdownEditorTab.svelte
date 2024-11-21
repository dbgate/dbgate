<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('MarkdownEditorTab');

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
    isRelatedToTab: true,
    keyText: 'F5 | CtrlOrCommand+Enter',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().preview(),
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

  export const activator = createActivator('MarkdownEditorTab', false);

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

  export async function preview() {
    await saveToStorage();
    const existing = ($openedTabs || []).find(x => x.props && x.props.sourceTabId == tabid && x.closedTime == null);
    if (existing) {
      setSelectedTab(existing.tabid);
    } else {
      const thisTab = ($openedTabs || []).find(x => x.tabid == tabid);
      openNewTab({
        title: thisTab.title,
        icon: 'img preview',
        tabComponent: 'MarkdownPreviewTab',
        props: {
          sourceTabId: tabid,
        },
      });
    }
  }

  const { editorState, editorValue, setEditorData, saveToStorage } = useEditorData({ tabid });

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
    activator.activate();
    invalidateCommands();
  }}
  bind:this={domEditor}
  mode="markdown"
/>
