<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('FavoriteEditorTab');

  registerFileCommands({
    idPrefix: 'favoriteJsonEditor',
    category: 'Favorite JSON editor',
    getCurrentEditor,
    folder: null,
    format: null,
    fileExtension: null,

    save: false,
    findReplace: true,
  });
  registerCommand({
    id: 'favoriteJsonEditor.save',
    group: 'save',
    name: 'Save',
    category: 'Favorite JSON editor',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().save(),
  });
  registerCommand({
    id: 'favoriteJsonEditor.preview',
    name: 'Preview',
    category: 'Favorite JSON editor',
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
  import invalidateCommands from '../commands/invalidateCommands';
  import { showModal } from '../modals/modalTools';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { openFavorite } from '../appobj/FavoriteFileAppObject.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { apiCall } from '../utility/api';

  export let tabid;
  export let savedFile;

  const tabFocused: any = getContext('tabFocused');

  export const activator = createActivator('FavoriteEditorTab', false);

  let domEditor;

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

  export function preview() {
    try {
      const data = JSON.parse(getData());
      openFavorite(data);
    } catch (err) {
      showModal(ErrorMessageModal, { message: err.message, title: 'Error parsing JSON' });
    }
  }

  const { editorState, editorValue, setEditorData } = useEditorData({ tabid });

  function createMenu() {
    return [
      { command: 'favoriteJsonEditor.save' },
      { command: 'favoriteJsonEditor.preview' },
      { divider: true },
      { command: 'favoriteJsonEditor.find' },
      { command: 'favoriteJsonEditor.replace' },
    ];
  }

  export function save() {
    try {
      const data = JSON.parse(getData());
      apiCall('files/save', {
        file: savedFile,
        folder: 'favorites',
        format: 'json',
        data,
      });
    } catch (err) {
      showModal(ErrorMessageModal, { message: err.message, title: 'Error parsing JSON' });
    }
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
  mode="json"
/>
