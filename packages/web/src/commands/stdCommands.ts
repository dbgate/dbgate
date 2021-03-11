import { currentTheme, extensions, visibleToolbar } from '../stores';
import registerCommand from './registerCommand';
import { derived, get } from 'svelte/store';
import { ThemeDefinition } from 'dbgate-types';
import ConnectionModal from '../modals/ConnectionModal.svelte';
import { showModal } from '../modals/modalTools';
import newQuery from '../query/newQuery';
import saveTabFile, { saveTabEnabledStore } from '../utility/saveTabFile';

function themeCommand(theme: ThemeDefinition) {
  return {
    text: theme.themeName,
    onClick: () => currentTheme.set(theme.className),
    // onPreview: () => {
    //   const old = get(currentTheme);
    //   currentTheme.set(css);
    //   return ok => {
    //     if (!ok) currentTheme.set(old);
    //   };
    // },
  };
}

registerCommand({
  id: 'theme.changeTheme',
  category: 'Theme',
  name: 'Change',
  getSubCommands: () => get(extensions).themes.map(themeCommand),
});

registerCommand({
  id: 'toolbar.show',
  category: 'Toolbar',
  name: 'Show',
  onClick: () => visibleToolbar.set(1),
  enabledStore: derived(visibleToolbar, $visibleToolbar => !$visibleToolbar),
});

registerCommand({
  id: 'toolbar.hide',
  category: 'Toolbar',
  name: 'Hide',
  onClick: () => visibleToolbar.set(0),
  enabledStore: derived(visibleToolbar, $visibleToolbar => $visibleToolbar),
});

registerCommand({
  id: 'new.connection',
  toolbar: true,
  icon: 'icon connection',
  toolbarName: 'Add connection',
  category: 'New',
  toolbarOrder: 1,
  name: 'Connection',
  onClick: () => showModal(ConnectionModal),
});

registerCommand({
  id: 'new.query',
  category: 'New',
  icon: 'icon file',
  toolbar: true,
  toolbarOrder: 2,
  name: 'Query',
  keyText: 'Ctrl+Q',
  onClick: () => newQuery(),
});

export function registerFileCommands({
  idPrefix,
  category,
  editorStore,
  editorStatusStore,
  folder,
  format,
  fileExtension,
  execute = false,
  toggleComment = false,
  findReplace = false,
}) {
  registerCommand({
    id: idPrefix + '.save',
    category,
    name: 'Save',
    keyText: 'Ctrl+S',
    icon: 'icon save',
    toolbar: true,
    enabledStore: saveTabEnabledStore(editorStore),
    onClick: () => saveTabFile(editorStore, false, folder, format, fileExtension),
  });
  registerCommand({
    id: idPrefix + '.saveAs',
    category,
    name: 'Save As',
    keyText: 'Ctrl+Shift+S',
    enabledStore: saveTabEnabledStore(editorStore),
    onClick: () => saveTabFile(editorStore, true, folder, format, fileExtension),
  });

  if (execute) {
    registerCommand({
      id: idPrefix + '.execute',
      category,
      name: 'Execute',
      icon: 'icon run',
      toolbar: true,
      keyText: 'F5 | Ctrl+Enter',
      enabledStore: derived(
        [editorStore, editorStatusStore],
        ([editor, status]) => editor != null && !(status as any).busy
      ),
      onClick: () => (get(editorStore) as any).execute(),
    });
    registerCommand({
      id: idPrefix + '.kill',
      category,
      name: 'Kill',
      icon: 'icon close',
      toolbar: true,
      enabledStore: derived(
        [editorStore, editorStatusStore],
        ([query, status]) => query != null && status && (status as any).isConnected
      ),
      onClick: () => (get(editorStore) as any).kill(),
    });
  }

  if (toggleComment) {
    registerCommand({
      id: idPrefix + '.toggleComment',
      category,
      name: 'Toggle comment',
      keyText: 'Ctrl+/',
      disableHandleKeyText: 'Ctrl+/',
      enabledStore: derived(editorStore, query => query != null),
      onClick: () => (get(editorStore) as any).toggleComment(),
    });
  }

  if (findReplace) {
    registerCommand({
      id: idPrefix + '.find',
      category,
      name: 'Find',
      keyText: 'Ctrl+F',
      enabledStore: derived(editorStore, query => query != null),
      onClick: () => (get(editorStore) as any).find(),
    });
    registerCommand({
      id: idPrefix + '.replace',
      category,
      keyText: 'Ctrl+H',
      name: 'Replace',
      enabledStore: derived(editorStore, query => query != null),
      onClick: () => (get(editorStore) as any).replace(),
    });
  }
}
