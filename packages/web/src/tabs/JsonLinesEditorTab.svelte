<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('JsonLinesEditorTab');

  registerFileCommands({
    idPrefix: 'jsonl',
    category: 'JSON Lines editor',
    getCurrentEditor,
    folder: null,
    format: 'text',
    fileExtension: 'jsonl',

    save: false,
    findReplace: true,
  });

  registerCommand({
    id: 'jsonl.save',
    group: 'save',
    category: 'JSON Lines editor',
    name: 'Save',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon save',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().save(),
  });

  registerCommand({
    id: 'jsonl.preview',
    category: 'JSON Lines editor',
    name: 'Preview',
    icon: 'icon preview',
    keyText: 'F5',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().preview(),
  });

  registerCommand({
    id: 'jsonl.previewNewTab',
    category: 'JSON Lines editor',
    name: 'Preview in new tab',
    icon: 'icon preview',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().previewMewTab(),
  });

  registerCommand({
    id: 'jsonl.closePreview',
    category: 'JSON Lines editor',
    name: 'Close preview',
    icon: 'icon close',
    testEnabled: () => getCurrentEditor()?.isPreview(),
    onClick: () => getCurrentEditor().closePreview(),
  });
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import { registerFileCommands } from '../commands/stdCommands';
  import uuidv1 from 'uuid/v1';

  import AceEditor from '../query/AceEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import invalidateCommands from '../commands/invalidateCommands';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { showModal } from '../modals/modalTools';
  import SaveArchiveModal from '../modals/SaveArchiveModal.svelte';
  import { changeTab } from '../utility/common';
  import { apiCall } from '../utility/api';
  import registerCommand from '../commands/registerCommand';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import openNewTab from '../utility/openNewTab';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import JslDataGrid from '../datagrid/JslDataGrid.svelte';
  import ToolStripCommandSplitButton from '../buttons/ToolStripCommandSplitButton.svelte';

  export let tabid;
  export let archiveFolder;
  export let archiveFile;

  let jslid = null;

  const tabFocused: any = getContext('tabFocused');

  export const activator = createActivator('JsonLinesEditorTab', false);

  let domEditor;
  let domToolStrip;

  $: if ($tabFocused && domEditor) {
    domEditor?.getEditor()?.focus();
  }

  export function getData() {
    return $editorState.value || '';
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

  export function isPreview() {
    return !!jslid;
  }

  export function closePreview() {
    jslid = null;
  }

  export function save() {
    showModal(SaveArchiveModal, {
      folder: archiveFolder,
      file: archiveFile,
      onSave: doSave,
    });
  }

  export async function previewMewTab() {
    const jslid = uuidv1();
    await apiCall('jsldata/save-text', { jslid, text: $editorState.value || '' });

    openNewTab(
      {
        title: 'Preview #',
        icon: 'img archive',
        tabComponent: 'ArchiveFileTab',
        props: {
          jslid,
        },
      },
      undefined,
      { forceNewTab: true }
    );
  }

  export async function preview() {
    jslid = uuidv1();
    await apiCall('jsldata/save-text', { jslid, text: $editorState.value || '' });
  }

  const doSave = async (folder, file) => {
    await apiCall('archive/save-text', { folder, file, text: $editorState.value || '' });
    changeTab(tabid, tab => ({
      ...tab,
      title: file,
      props: { archiveFile: file, archiveFolder: folder },
      archiveFile: file,
      archiveFolder: folder,
    }));
    archiveFile = file;
    archiveFolder = folder;
  };

  const { editorState, editorValue, setEditorData, saveToStorage } = useEditorData({ tabid });

  function createMenu() {
    return [
      { command: 'jsonl.save' },
      { command: 'jsonl.preview' },
      { divider: true },
      { command: 'jsonl.find' },
      { command: 'jsonl.replace' },
    ];
  }
</script>

<ToolStripContainer bind:this={domToolStrip}>
  <VerticalSplitter isSplitter={jslid}>
    <svelte:fragment slot="1">
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
    </svelte:fragment>
    <svelte:fragment slot="2">
      {#if jslid}
        {#key jslid}
          <JslDataGrid {jslid} supportsReload />
        {/key}
      {/if}
    </svelte:fragment>
  </VerticalSplitter>

  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="jsonl.save" />
    <ToolStripCommandSplitButton commands={['jsonl.preview', 'jsonl.previewNewTab']} />

    <ToolStripCommandButton command="jsonl.closePreview" />
  </svelte:fragment>
</ToolStripContainer>
