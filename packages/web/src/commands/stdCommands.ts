import { currentTheme, extensions, getVisibleToolbar, visibleToolbar } from '../stores';
import registerCommand from './registerCommand';
import { derived, get } from 'svelte/store';
import { ThemeDefinition } from 'dbgate-types';
import ConnectionModal from '../modals/ConnectionModal.svelte';
import { showModal } from '../modals/modalTools';
import newQuery from '../query/newQuery';
import saveTabFile, { saveTabEnabledStore } from '../utility/saveTabFile';
import openNewTab from '../utility/openNewTab';

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

export function registerFileCommands({
  idPrefix,
  category,
  getCurrentEditor,
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
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => saveTabFile(getCurrentEditor(), false, folder, format, fileExtension),
  });
  registerCommand({
    id: idPrefix + '.saveAs',
    category,
    name: 'Save As',
    keyText: 'Ctrl+Shift+S',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => saveTabFile(getCurrentEditor(), true, folder, format, fileExtension),
  });

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
}
