import { currentTheme, extensions, getVisibleToolbar, visibleToolbar } from '../stores';
import registerCommand from './registerCommand';
import { derived, get } from 'svelte/store';
import { ThemeDefinition } from 'dbgate-types';
import ConnectionModal from '../modals/ConnectionModal.svelte';
import AboutModal from '../modals/AboutModal.svelte';
import ImportExportModal from '../modals/ImportExportModal.svelte';
import { showModal } from '../modals/modalTools';
import newQuery from '../query/newQuery';
import saveTabFile from '../utility/saveTabFile';
import openNewTab from '../utility/openNewTab';
import getElectron from '../utility/getElectron';
import { openElectronFile } from '../utility/openElectronFile';
import { getDefaultFileFormat } from '../plugins/fileformats';
import { getCurrentConfig } from '../stores';

const electron = getElectron();

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
  testEnabled: () => !getVisibleToolbar(),
});

registerCommand({
  id: 'toolbar.hide',
  category: 'Toolbar',
  name: 'Hide',
  onClick: () => visibleToolbar.set(0),
  testEnabled: () => getVisibleToolbar(),
});

registerCommand({
  id: 'about.show',
  category: 'About',
  name: 'Show',
  toolbarName: 'About',
  onClick: () => showModal(AboutModal),
});

registerCommand({
  id: 'new.connection',
  toolbar: true,
  icon: 'icon new-connection',
  toolbarName: 'Add connection',
  category: 'New',
  toolbarOrder: 1,
  name: 'Connection',
  testEnabled: () => !getCurrentConfig()?.runAsPortal,
  onClick: () => showModal(ConnectionModal),
});

registerCommand({
  id: 'new.query',
  category: 'New',
  icon: 'icon file',
  toolbar: true,
  toolbarOrder: 2,
  name: 'Query',
  toolbarName: 'New query',
  keyText: 'Ctrl+Q',
  onClick: () => newQuery(),
});

registerCommand({
  id: 'new.shell',
  category: 'New',
  icon: 'img shell',
  name: 'JavaScript Shell',
  onClick: () => {
    openNewTab({
      title: 'Shell #',
      icon: 'img shell',
      tabComponent: 'ShellTab',
    });
  },
});

registerCommand({
  id: 'new.markdown',
  category: 'New',
  icon: 'img markdown',
  name: 'Markdown page',
  onClick: () => {
    openNewTab({
      title: 'Page #',
      icon: 'img markdown',
      tabComponent: 'MarkdownEditorTab',
    });
  },
});

registerCommand({
  id: 'new.freetable',
  category: 'New',
  icon: 'img markdown',
  name: 'Free table editor',
  onClick: () => {
    openNewTab({
      title: 'Data #',
      icon: 'img free-table',
      tabComponent: 'FreeTableTab',
    });
  },
});

registerCommand({
  id: 'group.save',
  category: null,
  isGroupCommand: true,
  name: 'Save',
  keyText: 'Ctrl+S',
  group: 'save',
});

registerCommand({
  id: 'group.saveAs',
  category: null,
  isGroupCommand: true,
  name: 'Save As',
  keyText: 'Ctrl+Shift+S',
  group: 'saveAs',
});

registerCommand({
  id: 'group.undo',
  category: null,
  isGroupCommand: true,
  name: 'Undo',
  keyText: 'Ctrl+Z',
  group: 'undo',
});

registerCommand({
  id: 'group.redo',
  category: null,
  isGroupCommand: true,
  name: 'Redo',
  keyText: 'Ctrl+Y',
  group: 'redo',
});

if (electron) {
  registerCommand({
    id: 'file.open',
    category: 'File',
    name: 'Open',
    keyText: 'Ctrl+O',
    onClick: openElectronFile,
  });
}

registerCommand({
  id: 'file.import',
  category: 'File',
  name: 'Import data',
  toolbar: true,
  icon: 'icon import',
  onClick: () =>
    showModal(ImportExportModal, {
      importToArchive: true,
      initialValues: { sourceStorageType: getDefaultFileFormat(get(extensions)).storageType },
    }),
});

export function registerFileCommands({
  idPrefix,
  category,
  getCurrentEditor,
  folder,
  format,
  fileExtension,
  save = true,
  execute = false,
  toggleComment = false,
  findReplace = false,
  undoRedo = false,
}) {
  if (save) {
    registerCommand({
      id: idPrefix + '.save',
      group: 'save',
      category,
      name: 'Save',
      // keyText: 'Ctrl+S',
      icon: 'icon save',
      toolbar: true,
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => saveTabFile(getCurrentEditor(), false, folder, format, fileExtension),
    });
    registerCommand({
      id: idPrefix + '.saveAs',
      group: 'saveAs',
      category,
      name: 'Save As',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => saveTabFile(getCurrentEditor(), true, folder, format, fileExtension),
    });
  }

  if (execute) {
    registerCommand({
      id: idPrefix + '.execute',
      category,
      name: 'Execute',
      icon: 'icon run',
      toolbar: true,
      keyText: 'F5 | Ctrl+Enter',
      testEnabled: () => getCurrentEditor() != null && !getCurrentEditor()?.isBusy(),
      onClick: () => getCurrentEditor().execute(),
    });
    registerCommand({
      id: idPrefix + '.kill',
      category,
      name: 'Kill',
      icon: 'icon close',
      toolbar: true,
      testEnabled: () => getCurrentEditor() != null && getCurrentEditor()?.canKill(),
      onClick: () => getCurrentEditor().kill(),
    });
  }

  if (toggleComment) {
    registerCommand({
      id: idPrefix + '.toggleComment',
      category,
      name: 'Toggle comment',
      keyText: 'Ctrl+/',
      disableHandleKeyText: 'Ctrl+/',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().toggleComment(),
    });
  }

  if (findReplace) {
    registerCommand({
      id: idPrefix + '.find',
      category,
      name: 'Find',
      keyText: 'Ctrl+F',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().find(),
    });
    registerCommand({
      id: idPrefix + '.replace',
      category,
      keyText: 'Ctrl+H',
      name: 'Replace',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().replace(),
    });
  }
  if (undoRedo) {
    registerCommand({
      id: idPrefix + '.undo',
      category,
      name: 'Undo',
      group: 'undo',
      testEnabled: () => getCurrentEditor()?.canUndo(),
      onClick: () => getCurrentEditor().undo(),
    });
    registerCommand({
      id: idPrefix + '.redo',
      category,
      group: 'redo',
      name: 'Redo',
      testEnabled: () => getCurrentEditor()?.canRedo(),
      onClick: () => getCurrentEditor().redo(),
    });
  }
}
