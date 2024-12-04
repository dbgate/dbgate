import {
  currentDatabase,
  currentTheme,
  emptyConnectionGroupNames,
  extensions,
  getAppUpdaterActive,
  getExtensions,
  getVisibleToolbar,
  visibleToolbar,
  visibleWidgetSideBar,
} from '../stores';
import registerCommand from './registerCommand';
import { get } from 'svelte/store';
import AboutModal from '../modals/AboutModal.svelte';
import SettingsModal from '../settings/SettingsModal.svelte';
import SqlGeneratorModal from '../modals/SqlGeneratorModal.svelte';
import { showModal } from '../modals/modalTools';
import newQuery, { newDiagram, newPerspective, newQueryDesign } from '../query/newQuery';
import saveTabFile from '../utility/saveTabFile';
import openNewTab from '../utility/openNewTab';
import getElectron from '../utility/getElectron';
import { openElectronFile } from '../utility/openElectronFile';
import { getDefaultFileFormat } from '../plugins/fileformats';
import { getCurrentConfig, getCurrentDatabase } from '../stores';
import './recentDatabaseSwitch';
import './changeDatabaseStatusCommand';
import hasPermission from '../utility/hasPermission';
import _ from 'lodash';
import { findEngineDriver } from 'dbgate-tools';
import { openArchiveFolder } from '../utility/openArchiveFolder';
import InputTextModal from '../modals/InputTextModal.svelte';
import { removeLocalStorage } from '../utility/storageCache';
import { showSnackbarSuccess } from '../utility/snackbar';
import { apiCall } from '../utility/api';
import runCommand from './runCommand';
import { getSettings } from '../utility/metadataLoaders';
import { isMac, switchCurrentDatabase } from '../utility/common';
import { doLogout } from '../clientAuth';
import { disconnectServerConnection } from '../appobj/ConnectionAppObject.svelte';
import UploadErrorModal from '../modals/UploadErrorModal.svelte';
import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
import NewCollectionModal from '../modals/NewCollectionModal.svelte';
import ConfirmModal from '../modals/ConfirmModal.svelte';
import localforage from 'localforage';
import { openImportExportTab } from '../utility/importExportTools';
import newTable from '../tableeditor/newTable';
import { isProApp } from '../utility/proTools';
import { openWebLink } from '../utility/simpleTools';

// function themeCommand(theme: ThemeDefinition) {
//   return {
//     text: theme.themeName,
//     onClick: () => currentTheme.set(theme.themeClassName),
//     // onPreview: () => {
//     //   const old = get(currentTheme);
//     //   currentTheme.set(css);
//     //   return ok => {
//     //     if (!ok) currentTheme.set(old);
//     //   };
//     // },
//   };
// }

registerCommand({
  id: 'theme.changeTheme',
  category: 'Theme',
  name: 'Change',
  toolbarName: 'Change theme',
  onClick: () => showModal(SettingsModal, { selectedTab: 2 }),
  // getSubCommands: () => get(extensions).themes.map(themeCommand),
});

registerCommand({
  id: 'toolbar.show',
  category: 'Toolbar',
  name: 'Show',
  onClick: () => visibleToolbar.set(true),
  testEnabled: () => !getVisibleToolbar(),
});

registerCommand({
  id: 'toolbar.hide',
  category: 'Toolbar',
  name: 'Hide',
  onClick: () => visibleToolbar.set(false),
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
  id: 'toggle.sidebar',
  category: 'Sidebar',
  name: 'Show',
  toolbarName: 'Toggle sidebar',
  keyText: 'CtrlOrCommand+B',
  onClick: () => visibleWidgetSideBar.update(x => !x),
});

registerCommand({
  id: 'new.connection',
  toolbar: true,
  icon: 'icon new-connection',
  toolbarName: 'Add connection',
  category: 'New',
  toolbarOrder: 1,
  name: 'Connection',
  testEnabled: () => !getCurrentConfig()?.runAsPortal && !getCurrentConfig()?.storageDatabase,
  onClick: () => {
    openNewTab({
      title: 'New Connection',
      icon: 'img connection',
      tabComponent: 'ConnectionTab',
    });
  },
});

registerCommand({
  id: 'new.connection.folder',
  toolbar: true,
  icon: 'icon add-folder',
  toolbarName: 'Add connection folder',
  category: 'New',
  toolbarOrder: 1,
  name: 'Connection folder',
  testEnabled: () => !getCurrentConfig()?.runAsPortal,
  onClick: () => {
    showModal(InputTextModal, {
      value: '',
      label: 'New connection folder name',
      header: 'Create connection folder',
      onConfirm: async folder => {
        emptyConnectionGroupNames.update(names => {
          if (!folder) return names;
          if (names.includes(folder)) return names;
          return [...names, folder];
        });
      },
    });
  },
});

registerCommand({
  id: 'new.query',
  category: 'New',
  icon: 'icon file',
  toolbar: true,
  toolbarOrder: 2,
  name: 'Query',
  toolbarName: 'New query',
  keyText: 'CtrlOrCommand+T',
  onClick: () => newQuery(),
});

registerCommand({
  id: 'new.shell',
  category: 'New',
  icon: 'img shell',
  name: 'JavaScript Shell',
  menuName: 'New JavaScript shell',
  onClick: () => {
    openNewTab({
      title: 'Shell #',
      icon: 'img shell',
      tabComponent: 'ShellTab',
    });
  },
});

if (isProApp()) {
  registerCommand({
    id: 'new.queryDesign',
    category: 'New',
    icon: 'img query-design',
    name: 'Query design',
    menuName: 'New query design',
    onClick: () => newQueryDesign(),
    testEnabled: () =>
      getCurrentDatabase() &&
      findEngineDriver(getCurrentDatabase()?.connection, getExtensions())?.databaseEngineTypes?.includes('sql'),
  });
}

if (isProApp()) {
  registerCommand({
    id: 'new.modelTransform',
    category: 'New',
    icon: 'img transform',
    name: 'Model transform',
    menuName: 'New model transform',
    onClick: () => {
      openNewTab(
        {
          title: 'Model transform #',
          icon: 'img transform',
          tabComponent: 'ModelTransformTab',
        },
        {
          editor: JSON.stringify(
            [
              {
                transform: 'dataTypeMapperTransform',
                arguments: ['json', 'nvarchar(max)'],
              },
              {
                transform: 'sqlTextReplacementTransform',
                arguments: [
                  {
                    oldval1: 'newval1',
                    oldval2: 'newval2',
                  },
                ],
              },
              {
                transform: 'autoIndexForeignKeysTransform',
                arguments: [],
              },
            ],
            null,
            2
          ),
        }
      );
    },
  });
}

if (isProApp()) {
  registerCommand({
    id: 'new.perspective',
    category: 'New',
    icon: 'img perspective',
    name: 'Perspective',
    menuName: 'New perspective',
    onClick: () => newPerspective(),
  });
}

registerCommand({
  id: 'new.diagram',
  category: 'New',
  icon: 'img diagram',
  name: 'ER Diagram',
  menuName: 'New ER diagram',
  testEnabled: () =>
    getCurrentDatabase() &&
    findEngineDriver(getCurrentDatabase()?.connection, getExtensions())?.databaseEngineTypes?.includes('sql'),
  onClick: () => newDiagram(),
});

registerCommand({
  id: 'new.archiveFolder',
  category: 'New',
  icon: 'img archive',
  name: 'Archive folder',
  onClick: () => {
    showModal(InputTextModal, {
      value: '',
      label: 'New archive folder name',
      header: 'Create archive folder',
      onConfirm: async folder => {
        apiCall('archive/create-folder', { folder });
      },
    });
  },
});

registerCommand({
  id: 'new.application',
  category: 'New',
  icon: 'img app',
  name: 'Application',
  onClick: () => {
    showModal(InputTextModal, {
      value: '',
      label: 'New application name',
      header: 'Create application',
      onConfirm: async folder => {
        apiCall('apps/create-folder', { folder });
      },
    });
  },
});

registerCommand({
  id: 'new.table',
  category: 'New',
  icon: 'icon table',
  name: 'Table',
  toolbar: true,
  toolbarName: 'New table',
  testEnabled: () => {
    const driver = findEngineDriver(get(currentDatabase)?.connection, getExtensions());
    return !!get(currentDatabase) && driver?.databaseEngineTypes?.includes('sql');
  },
  onClick: () => {
    const $currentDatabase = get(currentDatabase);
    const connection = _.get($currentDatabase, 'connection') || {};
    const database = _.get($currentDatabase, 'name');
    newTable(connection, database);
  },
});

registerCommand({
  id: 'new.collection',
  category: 'New',
  icon: 'icon table',
  name: 'Collection',
  toolbar: true,
  toolbarName: 'New collection/container',
  testEnabled: () => {
    const driver = findEngineDriver(get(currentDatabase)?.connection, getExtensions());
    return !!get(currentDatabase) && driver?.databaseEngineTypes?.includes('document');
  },
  onClick: async () => {
    const $currentDatabase = get(currentDatabase);
    const connection = _.get($currentDatabase, 'connection') || {};
    const database = _.get($currentDatabase, 'name');
    const driver = findEngineDriver(get(currentDatabase)?.connection, getExtensions());

    const dbid = { conid: connection._id, database };

    showModal(NewCollectionModal, {
      driver,
      dbid,
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

if (isProApp()) {
  registerCommand({
    id: 'new.modelCompare',
    category: 'New',
    icon: 'icon compare',
    name: 'Compare DB',
    toolbar: true,
    onClick: () => {
      openNewTab({
        title: 'Compare',
        icon: 'img compare',
        tabComponent: 'CompareModelTab',
      });
    },
  });
}

registerCommand({
  id: 'new.jsonl',
  category: 'New',
  icon: 'img archive',
  name: 'JSON Lines',
  menuName: 'New JSON lines file',
  onClick: () => {
    openNewTab(
      {
        title: 'Lines #',
        icon: 'img archive',
        tabComponent: 'JsonLinesEditorTab',
      },
      {
        editor: '{"col1": "val1", "col2": "val2"}',
      }
    );
  },
});

registerCommand({
  id: 'new.sqliteDatabase',
  category: 'New',
  icon: 'img sqlite-database',
  name: 'SQLite database',
  menuName: 'New SQLite database',
  onClick: () => {
    showModal(InputTextModal, {
      value: 'newdb',
      label: 'New database name',
      header: 'Create SQLite database',
      onConfirm: async file => {
        const resp = await apiCall('connections/new-sqlite-database', { file });
        const connection = resp;
        switchCurrentDatabase({ connection, name: `${file}.sqlite` });
      },
    });
  },
});

registerCommand({
  id: 'tabs.changelog',
  category: 'Tabs',
  name: 'Changelog',
  onClick: () => {
    openNewTab({
      title: 'ChangeLog',
      icon: 'img markdown',
      tabComponent: 'ChangelogTab',
      props: {},
    });
  },
});

registerCommand({
  id: 'group.save',
  category: null,
  isGroupCommand: true,
  name: 'Save',
  keyText: 'CtrlOrCommand+S',
  group: 'save',
});

registerCommand({
  id: 'group.saveAs',
  category: null,
  isGroupCommand: true,
  name: 'Save As',
  keyText: 'CtrlOrCommand+Shift+S',
  group: 'saveAs',
});

registerCommand({
  id: 'group.undo',
  category: null,
  isGroupCommand: true,
  name: 'Undo',
  keyText: 'CtrlOrCommand+Z',
  group: 'undo',
});

registerCommand({
  id: 'group.redo',
  category: null,
  isGroupCommand: true,
  name: 'Redo',
  keyText: 'CtrlOrCommand+Y',
  group: 'redo',
});

registerCommand({
  id: 'file.open',
  category: 'File',
  name: 'Open',
  keyText: 'CtrlOrCommand+O',
  testEnabled: () => getElectron() != null,
  onClick: openElectronFile,
});

registerCommand({
  id: 'file.openArchive',
  category: 'File',
  name: 'Open DB Model/Archive',
  testEnabled: () => getElectron() != null,
  onClick: openArchiveFolder,
});

registerCommand({
  id: 'folder.showLogs',
  category: 'Folder',
  name: 'Open logs',
  testEnabled: () => getElectron() != null,
  onClick: () => electron.showItemInFolder(getCurrentConfig().logsFilePath),
});

registerCommand({
  id: 'folder.showData',
  category: 'Folder',
  name: 'Open data folder',
  testEnabled: () => getElectron() != null,
  onClick: () => electron.showItemInFolder(getCurrentConfig().connectionsFilePath),
});

registerCommand({
  id: 'app.resetSettings',
  category: 'File',
  name: 'Reset layout data & settings',
  testEnabled: () => true,
  onClick: () => {
    showModal(ConfirmModal, {
      message: `Really reset layout data? All opened tabs, settings and layout data will be lost. Connections and saved files will be preserved. After this, restart DbGate for applying changes.`,
      onConfirm: async () => {
        await apiCall('config/delete-settings');
        localStorage.clear();
        await localforage.clear();
        if (getElectron()) {
          getElectron().send('reset-settings');
        } else {
          window.location.reload();
        }
      },
    });
  },
});

registerCommand({
  id: 'file.import',
  category: 'File',
  name: 'Import data',
  toolbar: true,
  icon: 'icon import',
  onClick: () =>
    openImportExportTab(
      {
        sourceStorageType: getDefaultFileFormat(get(extensions)).storageType,
      },
      {
        importToCurrentTarget: true,
      }
    ),
  // showModal(ImportExportModal, {
  //   importToCurrentTarget: true,
  //   initialValues: { sourceStorageType: getDefaultFileFormat(get(extensions)).storageType },
  // }),
});

registerCommand({
  id: 'view.reset',
  category: 'View',
  name: 'Reset view',
  onClick: () => {
    const keys = [
      'leftPanelWidth',
      'visibleToolbar',
      'selectedWidget',
      'currentTheme',

      'connectionsWidget',
      'pinnedItemsWidget',
      'dbObjectsWidget',

      'favoritesWidget',
      'savedFilesWidget',

      'closedTabsWidget',
      'queryHistoryWidget',

      'archiveFoldersWidget',
      'archiveFilesWidget',

      'installedPluginsWidget',
      'allPluginsWidget',

      'currentArchive',
    ];
    for (const key of keys) removeLocalStorage(key);
    showSnackbarSuccess('Restart DbGate (or reload on web) for applying changes');
  },
});

registerCommand({
  id: 'sql.generator',
  category: 'SQL',
  name: 'SQL Generator',
  toolbar: true,
  icon: 'icon sql-generator',
  testEnabled: () => getCurrentDatabase() != null && hasPermission(`dbops/sql-generator`),
  onClick: () =>
    showModal(SqlGeneratorModal, {
      conid: getCurrentDatabase()?.connection?._id,
      database: getCurrentDatabase()?.name,
    }),
});

if (hasPermission('settings/change')) {
  registerCommand({
    id: 'settings.commands',
    category: 'Settings',
    name: 'Keyboard shortcuts',
    onClick: () => {
      openNewTab({
        title: 'Keyboard Shortcuts',
        icon: 'icon keyboard',
        tabComponent: 'CommandListTab',
        props: {},
      });
    },
  });

  registerCommand({
    id: 'settings.show',
    category: 'Settings',
    name: 'Change',
    toolbarName: 'Settings',
    onClick: () => showModal(SettingsModal),
  });
}

registerCommand({
  id: 'file.exit',
  category: 'File',
  name: isMac() ? 'Quit' : 'Exit',
  // keyText: isMac() ? 'Command+Q' : null,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('quit-app'),
});

registerCommand({
  id: 'app.logout',
  category: 'App',
  name: 'Logout',
  testEnabled: () => getCurrentConfig()?.isUserLoggedIn,
  onClick: doLogout,
});

registerCommand({
  id: 'app.disconnect',
  category: 'App',
  name: 'Disconnect',
  testEnabled: () => getCurrentConfig()?.singleConnection != null && !getCurrentConfig()?.isUserLoggedIn,
  onClick: () => disconnectServerConnection(getCurrentConfig()?.singleConnection?._id),
});

registerCommand({
  id: 'file.checkForUpdates',
  category: 'App',
  name: 'Check for updates',
  // testEnabled: () => true,
  testEnabled: () => getAppUpdaterActive(),
  onClick: () => getElectron().send('check-for-updates'),
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
  executeAdditionalCondition = null,
  copyPaste = false,
}) {
  if (save) {
    registerCommand({
      id: idPrefix + '.save',
      group: 'save',
      category,
      name: 'Save',
      // keyText: 'CtrlOrCommand+S',
      icon: 'icon save',
      toolbar: true,
      isRelatedToTab: true,
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => saveTabFile(getCurrentEditor(), 'save', folder, format, fileExtension),
    });
    registerCommand({
      id: idPrefix + '.saveAs',
      group: 'saveAs',
      category,
      name: 'Save As',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => saveTabFile(getCurrentEditor(), 'save-as', folder, format, fileExtension),
    });
    registerCommand({
      id: idPrefix + '.saveToDisk',
      category,
      name: 'Save to disk',
      testEnabled: () => getCurrentEditor() != null && getElectron() != null,
      onClick: () => saveTabFile(getCurrentEditor(), 'save-to-disk', folder, format, fileExtension),
    });
  }

  if (execute) {
    registerCommand({
      id: idPrefix + '.execute',
      category,
      name: 'Execute',
      icon: 'icon run',
      toolbar: true,
      isRelatedToTab: true,
      keyText: 'F5 | CtrlOrCommand+Enter',
      testEnabled: () =>
        getCurrentEditor() != null &&
        !getCurrentEditor()?.isBusy() &&
        (executeAdditionalCondition == null || executeAdditionalCondition()),
      onClick: () => getCurrentEditor().execute(),
    });
    registerCommand({
      id: idPrefix + '.kill',
      category,
      name: 'Kill',
      icon: 'icon close',
      toolbar: true,
      isRelatedToTab: true,
      testEnabled: () => getCurrentEditor()?.canKill && getCurrentEditor().canKill(),
      onClick: () => getCurrentEditor().kill(),
    });
  }

  if (toggleComment) {
    registerCommand({
      id: idPrefix + '.toggleComment',
      category,
      name: 'Toggle comment',
      keyText: 'CtrlOrCommand+/',
      disableHandleKeyText: 'CtrlOrCommand+/',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().toggleComment(),
    });
  }

  if (copyPaste) {
    registerCommand({
      id: idPrefix + '.copy',
      category,
      name: 'Copy',
      disableHandleKeyText: 'CtrlOrCommand+C',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().copy(),
    });
    registerCommand({
      id: idPrefix + '.paste',
      category,
      name: 'Paste',
      disableHandleKeyText: 'CtrlOrCommand+V',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().paste(),
    });
  }

  if (findReplace) {
    registerCommand({
      id: idPrefix + '.find',
      category,
      name: 'Find',
      keyText: 'CtrlOrCommand+F',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().find(),
    });
    registerCommand({
      id: idPrefix + '.replace',
      category,
      keyText: isMac() ? 'Alt+Command+F' : 'CtrlOrCommand+H',
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
      icon: 'icon undo',
      testEnabled: () => getCurrentEditor()?.canUndo(),
      onClick: () => getCurrentEditor().undo(),
    });
    registerCommand({
      id: idPrefix + '.redo',
      category,
      group: 'redo',
      name: 'Redo',
      icon: 'icon redo',
      testEnabled: () => getCurrentEditor()?.canRedo(),
      onClick: () => getCurrentEditor().redo(),
    });
  }
}

registerCommand({
  id: 'app.minimize',
  category: 'Application',
  name: 'Minimize',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'minimize'),
});

registerCommand({
  id: 'app.maximize',
  category: 'Application',
  name: 'Maximize',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'maximize'),
});

registerCommand({
  id: 'app.toggleFullScreen',
  category: 'Application',
  name: 'Toggle full screen',
  keyText: 'F11',
  testEnabled: () => getElectron() != null,
  onClick: async () => {
    const settings = await getSettings();
    const value = !settings['app.fullscreen'];
    apiCall('config/update-settings', { 'app.fullscreen': value });
    if (value) getElectron().send('window-action', 'fullscreen-on');
    else getElectron().send('window-action', 'fullscreen-off');
  },
});

registerCommand({
  id: 'app.toggleDevTools',
  category: 'Application',
  name: 'Toggle Dev Tools',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'devtools'),
});

registerCommand({
  id: 'app.reload',
  category: 'Application',
  name: 'Reload',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'reload'),
});

registerCommand({
  id: 'app.openDocs',
  category: 'Application',
  name: 'Documentation',
  onClick: () => openWebLink('https://dbgate.org/docs/'),
});

registerCommand({
  id: 'app.openWeb',
  category: 'Application',
  name: 'DbGate web',
  onClick: () => openWebLink('https://dbgate.org'),
});

registerCommand({
  id: 'app.openIssue',
  category: 'Application',
  name: 'Report problem or feature request',
  onClick: () => openWebLink('https://github.com/dbgate/dbgate/issues/new'),
});

registerCommand({
  id: 'app.openSponsoring',
  category: 'Application',
  name: 'Become sponsor',
  onClick: () => openWebLink('https://opencollective.com/dbgate'),
});

registerCommand({
  id: 'app.zoomIn',
  category: 'Application',
  name: 'Zoom in',
  keyText: 'CtrlOrCommand+=',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'zoomin'),
});

registerCommand({
  id: 'app.zoomOut',
  category: 'Application',
  name: 'Zoom out',
  keyText: 'CtrlOrCommand+-',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'zoomout'),
});

registerCommand({
  id: 'app.zoomReset',
  category: 'Application',
  name: 'Reset zoom',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'zoomreset'),
});

registerCommand({
  id: 'edit.undo',
  category: 'Edit',
  name: 'Undo',
  keyText: 'CtrlOrCommand+Z',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'undo'),
});

registerCommand({
  id: 'edit.redo',
  category: 'Edit',
  name: 'Redo',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'redo'),
});

registerCommand({
  id: 'edit.cut',
  category: 'Edit',
  name: 'Cut',
  keyText: 'CtrlOrCommand+X',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'cut'),
});

registerCommand({
  id: 'edit.copy',
  category: 'Edit',
  name: 'Copy',
  keyText: 'CtrlOrCommand+C',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'copy'),
});

registerCommand({
  id: 'edit.paste',
  category: 'Edit',
  name: 'Paste',
  keyText: 'CtrlOrCommand+V',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'paste'),
});

registerCommand({
  id: 'edit.selectAll',
  category: 'Edit',
  name: 'Select All',
  keyText: 'CtrlOrCommand+A',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'selectAll'),
});

registerCommand({
  id: 'new.gist',
  category: 'New',
  name: 'Upload error to gist',
  onClick: () => showModal(UploadErrorModal),
});

registerCommand({
  id: 'app.unsetCurrentDatabase',
  category: 'Application',
  name: 'Unset current database',
  testEnabled: () => getCurrentDatabase() != null,
  onClick: () => currentDatabase.set(null),
});

const electron = getElectron();
if (electron) {
  electron.addEventListener('run-command', (e, commandId) => runCommand(commandId));
}
