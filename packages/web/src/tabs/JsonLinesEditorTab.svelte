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
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().preview(),
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

  export let tabid;
  export let archiveFolder;
  export let archiveFile;

  const tabVisible: any = getContext('tabVisible');

  export const activator = createActivator('JsonLinesEditorTab', false);

  let domEditor;

  $: if ($tabVisible && domEditor) {
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

  export function save() {
    showModal(SaveArchiveModal, {
      folder: archiveFolder,
      file: archiveFile,
      onSave: doSave,
    });
  }

  export async function preview() {
    const jslid = uuidv1();
    await apiCall('jsldata/save-text', { jslid, text: $editorState.value || '' });

    openNewTab({
      title: 'Preview #',
      icon: 'img archive',
      tabComponent: 'ArchiveFileTab',
      props: {
        jslid,
      },
    });
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

<ToolStripContainer>
  <AceEditor
    value={$editorState.value || ''}
    menu={createMenu()}
    on:input={e => setEditorData(e.detail)}
    on:focus={() => {
      activator.activate();
      invalidateCommands();
    }}
    bind:this={domEditor}
    mode="json"
  />
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="jsonl.save" />
    <ToolStripCommandButton command="jsonl.preview" />
  </svelte:fragment>
</ToolStripContainer>
