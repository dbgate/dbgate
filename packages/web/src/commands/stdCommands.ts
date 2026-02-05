import {
  cloudSigninTokenHolder,
  currentDatabase,
  emptyConnectionGroupNames,
  extensions,
  getAppUpdaterActive,
  getCloudSigninTokenHolder,
  getExtensions,
  promoWidgetPreview,
  visibleWidgetSideBar,
  selectedWidget,
} from '../stores';
import registerCommand from './registerCommand';
import { get } from 'svelte/store';
import AboutModal from '../modals/AboutModal.svelte';
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
import NewCollectionModal from '../modals/NewCollectionModal.svelte';
import ConfirmModal from '../modals/ConfirmModal.svelte';
import localforage from 'localforage';
import { openImportExportTab } from '../utility/importExportTools';
import newTable from '../tableeditor/newTable';
import { isProApp } from '../utility/proTools';
import { openWebLink } from '../utility/simpleTools';
import { _t } from '../translations';
import ExportImportConnectionsModal from '../modals/ExportImportConnectionsModal.svelte';
import { getBoolSettingsValue } from '../settings/settingsTools';
import { __t } from '../translations';

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
  category: __t('command.theme', { defaultMessage: 'Theme' }),
  name: __t('command.theme.change', { defaultMessage: 'Change' }),
  toolbarName: __t('command.theme.changeToolbar', { defaultMessage: 'Change theme' }),
  onClick: () =>
    openNewTab({
      title: 'Settings',
      icon: 'icon settings',
      tabComponent: 'SettingsTab',
      props: {
        selectedItem: 'theme',
      },
    }),
  // getSubCommands: () => get(extensions).themes.map(themeCommand),
});

registerCommand({
  id: 'about.show',
  category: __t('command.about', { defaultMessage: 'About' }),
  name: __t('command.about.show', { defaultMessage: 'Show' }),
  toolbarName: __t('command.about.toolbar', { defaultMessage: 'About' }),
  onClick: () => showModal(AboutModal),
});

registerCommand({
  id: 'toggle.sidebar',
  category: __t('command.sidebar', { defaultMessage: 'Sidebar' }),
  name: __t('command.sidebar.show', { defaultMessage: 'Show' }),
  toolbarName: __t('command.sidebar.toggleToolbar', { defaultMessage: 'Toggle sidebar' }),
  keyText: 'CtrlOrCommand+B',
  onClick: () => visibleWidgetSideBar.update(x => !x),
});

registerCommand({
  id: 'new.connection',
  toolbar: true,
  icon: 'icon new-connection',
  toolbarName: __t('command.new.connection', { defaultMessage: 'Add connection' }),
  category: __t('command.new', { defaultMessage: 'New' }),
  toolbarOrder: 1,
  name: __t('command.new.connection', { defaultMessage: 'Connection' }),
  testEnabled: () => !getCurrentConfig()?.runAsPortal && !getCurrentConfig()?.storageDatabase,
  onClick: () => {
    openNewTab({
      title: _t('common.newConnection', { defaultMessage: 'New Connection' }),
      icon: 'img connection',
      tabComponent: 'ConnectionTab',
    });
  },
});

registerCommand({
  id: 'new.connectionOnCloud',
  toolbar: true,
  icon: 'img cloud-connection',
  toolbarName: __t('command.new.connection', { defaultMessage: 'Add connection' }),
  category: __t('command.new', { defaultMessage: 'New' }),
  toolbarOrder: 1,
  name: __t('command.new.connectionCloud', { defaultMessage: 'Connection on Cloud' }),
  testEnabled: () =>
    !getCurrentConfig()?.runAsPortal && !getCurrentConfig()?.storageDatabase && !!getCloudSigninTokenHolder(),
  onClick: () => {
    openNewTab({
      title: _t('common.newConnectionCloud', { defaultMessage: 'New Connection on Cloud' }),
      icon: 'img cloud-connection',
      tabComponent: 'ConnectionTab',
      props: {
        saveOnCloud: true,
      },
    });
  },
});

registerCommand({
  id: 'new.connection.folder',
  toolbar: true,
  icon: 'icon add-folder',
  toolbarName: __t('command.new.connectionFolderToolbar', { defaultMessage: 'Add connection folder' }),
  category: __t('command.new', { defaultMessage: 'New' }),
  toolbarOrder: 1,
  name: __t('command.new.connectionFolder', { defaultMessage: 'Connection folder' }),
  testEnabled: () => !getCurrentConfig()?.runAsPortal,
  onClick: () => {
    showModal(InputTextModal, {
      value: '',
      label: _t('connection.createNewFolderName', { defaultMessage: 'New connection folder name' }),
      header: _t('connection.createNewFolder', { defaultMessage: 'Create connection folder' }),
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
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'icon file',
  toolbar: true,
  toolbarOrder: 2,
  name: __t('command.new.query', { defaultMessage: 'Query' }),
  toolbarName: __t('command.new.queryToolbar', { defaultMessage: 'New query' }),
  keyText: 'CtrlOrCommand+T',
  onClick: () => newQuery(),
});

registerCommand({
  id: 'new.shell',
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'img shell',
  name: __t('command.new.shell', { defaultMessage: 'JavaScript Shell' }),
  menuName: __t('command.new.JSShell', { defaultMessage: 'New JavaScript shell' }),
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
    category: __t('command.new', { defaultMessage: 'New' }),
    icon: 'img query-design',
    name: __t('command.new.queryDesign', { defaultMessage: 'Query design' }),
    menuName: __t('command.new.newQueryDesign', { defaultMessage: 'New query design' }),
    onClick: () => newQueryDesign(),
    testEnabled: () =>
      getCurrentDatabase() &&
      findEngineDriver(getCurrentDatabase()?.connection, getExtensions())?.databaseEngineTypes?.includes('sql'),
  });
}

if (isProApp()) {
  registerCommand({
    id: 'new.modelTransform',
    category: __t('command.new', { defaultMessage: 'New' }),
    icon: 'img transform',
    name: __t('command.new.modelTransform', { defaultMessage: 'Model transform' }),
    menuName: __t('command.new.newModelTransform', { defaultMessage: 'New model transform' }),
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
    category: __t('command.new', { defaultMessage: 'New' }),
    icon: 'img perspective',
    name: __t('command.new.perspective', { defaultMessage: 'Perspective' }),
    menuName: __t('command.new.newPerspective', { defaultMessage: 'New perspective' }),
    onClick: () => newPerspective(),
  });
}

if (isProApp()) {
  registerCommand({
    id: 'new.application',
    category: __t('command.new', { defaultMessage: 'New' }),
    icon: 'img app',
    name: __t('command.new.application', { defaultMessage: 'Application' }),
    menuName: __t('command.new.newApplication', { defaultMessage: 'New application' }),
    onClick: () => {
      openNewTab({
        title: 'Application #',
        icon: 'img app',
        tabComponent: 'AppEditorTab',
      });
    },
  });
}

registerCommand({
  id: 'new.diagram',
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'img diagram',
  name: __t('command.new.diagram', { defaultMessage: 'ER Diagram' }),
  menuName: __t('command.new.newDiagram', { defaultMessage: 'New ER diagram' }),
  testEnabled: () =>
    getCurrentDatabase() &&
    findEngineDriver(getCurrentDatabase()?.connection, getExtensions())?.databaseEngineTypes?.includes('sql'),
  onClick: () => newDiagram(),
});

registerCommand({
  id: 'new.archiveFolder',
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'img archive',
  name: __t('command.new.archiveFolder', { defaultMessage: 'Archive folder' }),
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

// registerCommand({
//   id: 'new.application',
//   category: 'New',
//   icon: 'img app',
//   name: 'Application',
//   onClick: () => {
//     showModal(InputTextModal, {
//       value: '',
//       label: 'New application name',
//       header: 'Create application',
//       onConfirm: async folder => {
//         apiCall('apps/create-folder', { folder });
//       },
//     });
//   },
// });

registerCommand({
  id: 'new.table',
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'icon table',
  name: __t('command.new.table', { defaultMessage: 'Table' }),
  toolbar: true,
  toolbarName: __t('command.new.tableToolbar', { defaultMessage: 'New table' }),
  testEnabled: () => {
    if (!hasPermission('dbops/model/edit')) return false;
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
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'icon table',
  name: __t('command.new.collection', { defaultMessage: 'Collection' }),
  toolbar: true,
  toolbarName: __t('command.new.collectionToolbar', { defaultMessage: 'New collection/container' }),
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
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'img markdown',
  name: __t('command.new.markdown', { defaultMessage: 'Markdown page' }),
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
    category: __t('command.new', { defaultMessage: 'New' }),
    icon: 'icon compare',
    name: __t('command.new.modelCompare', { defaultMessage: 'Compare DB' }),
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
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'img archive',
  name: __t('command.new.jsonl', { defaultMessage: 'JSON Lines' }),
  menuName: __t('command.new.newJsonl', { defaultMessage: 'New JSON lines file' }),
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
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'img sqlite-database',
  name: __t('command.new.sqliteDatabase', { defaultMessage: 'SQLite database' }),
  menuName: __t('command.new.sqliteDatabase', { defaultMessage: 'New SQLite database' }),
  onClick: () => {
    showModal(InputTextModal, {
      value: 'newdb',
      label: _t('app.databaseName', { defaultMessage: 'Database name' }),
      header: _t('command.new.sqliteDatabase', { defaultMessage: 'New SQLite database' }),
      onConfirm: async file => {
        const resp = await apiCall('connections/new-sqlite-database', { file });
        const connection = resp;
        switchCurrentDatabase({ connection, name: `${file}.sqlite` });
      },
    });
  },
});

registerCommand({
  id: 'new.duckdbDatabase',
  category: __t('command.new', { defaultMessage: 'New' }),
  icon: 'img sqlite-database',
  name: __t('command.new.duckdbDatabase', { defaultMessage: 'DuckDB database' }),
  menuName: __t('command.new.duckdbDatabase', { defaultMessage: 'New DuckDB database' }),
  onClick: () => {
    showModal(InputTextModal, {
      value: 'newdb',
      label: _t('app.databaseName', { defaultMessage: 'Database name' }),
      header: _t('command.new.duckdbDatabase', { defaultMessage: 'New DuckDB database' }),
      onConfirm: async file => {
        const resp = await apiCall('connections/new-duckdb-database', { file });
        const connection = resp;
        switchCurrentDatabase({ connection, name: `${file}.duckdb` });
      },
    });
  },
});

registerCommand({
  id: 'tabs.changelog',
  category: __t('command.tabs', { defaultMessage: 'Tabs' }),
  name: __t('command.tabs.changelog', { defaultMessage: 'Changelog' }),
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
  name: __t('command.save', { defaultMessage: 'Save' }),
  keyText: 'CtrlOrCommand+S',
  group: 'save',
});

registerCommand({
  id: 'group.saveAs',
  category: null,
  isGroupCommand: true,
  name: __t('command.saveAs', { defaultMessage: 'Save As' }),
  keyText: 'CtrlOrCommand+Shift+S',
  group: 'saveAs',
});

registerCommand({
  id: 'group.undo',
  category: null,
  isGroupCommand: true,
  name: __t('command.undo', { defaultMessage: 'Undo' }),
  keyText: 'CtrlOrCommand+Z',
  group: 'undo',
});

registerCommand({
  id: 'group.redo',
  category: null,
  isGroupCommand: true,
  name: __t('command.redo', { defaultMessage: 'Redo' }),
  keyText: 'CtrlOrCommand+Y',
  group: 'redo',
});

registerCommand({
  id: 'file.open',
  category: __t('command.file', { defaultMessage: 'File' }),
  name: __t('command.file.open', { defaultMessage: 'Open' }),
  keyText: 'CtrlOrCommand+O',
  testEnabled: () => getElectron() != null,
  onClick: openElectronFile,
});

registerCommand({
  id: 'file.openArchive',
  category: __t('command.file', { defaultMessage: 'File' }),
  name: __t('command.file.openArchive', { defaultMessage: 'Open DB Model/Archive' }),
  testEnabled: () => getElectron() != null,
  onClick: openArchiveFolder,
});

registerCommand({
  id: 'folder.showLogs',
  category: __t('command.folder', { defaultMessage: 'Folder' }),
  name: __t('command.folder.openLogs', { defaultMessage: 'Open logs' }),
  testEnabled: () => getElectron() != null,
  onClick: () => electron.showItemInFolder(getCurrentConfig().logsFilePath),
});

registerCommand({
  id: 'folder.showData',
  category: __t('command.folder', { defaultMessage: 'Folder' }),
  name: __t('command.folder.openData', { defaultMessage: 'Open data folder' }),
  testEnabled: () => getElectron() != null,
  onClick: () => electron.showItemInFolder(getCurrentConfig().connectionsFilePath),
});

registerCommand({
  id: 'app.resetSettings',
  category: __t('command.file', { defaultMessage: 'File' }),
  name: __t('command.file.resetLayout', { defaultMessage: 'Reset layout data & settings' }),
  testEnabled: () => true,
  onClick: () => {
    showModal(ConfirmModal, {
      message: _t('command.file.resetLayoutConfirm', {
        defaultMessage:
          'Really reset layout data? All opened tabs, settings and layout data will be lost. Connections and saved files will be preserved. After this, restart DbGate for applying changes.',
      }),
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
  id: 'app.exportConnections',
  category: __t('command.settings', { defaultMessage: 'Settings' }),
  name: __t('command.settings.exportConnections', { defaultMessage: 'Export connections' }),
  testEnabled: () => !getCurrentConfig()?.runAsPortal && !getCurrentConfig()?.storageDatabase,
  onClick: () => {
    showModal(ExportImportConnectionsModal, {
      mode: 'export',
    });
  },
});

registerCommand({
  id: 'app.importConnections',
  category: __t('command.settings', { defaultMessage: 'Settings' }),
  name: __t('command.settings.importConnections', { defaultMessage: 'Import connections' }),
  testEnabled: () => !getCurrentConfig()?.runAsPortal && !getCurrentConfig()?.storageDatabase,
  onClick: async () => {
    const files = await electron.showOpenDialog({
      properties: ['showHiddenFiles', 'openFile'],
      filters: [
        {
          name: `All supported files`,
          extensions: ['zip'],
        },
        { name: `ZIP files`, extensions: ['zip'] },
      ],
    });

    if (files?.length > 0) {
      showModal(ExportImportConnectionsModal, {
        mode: 'import',
        uploadedFilePath: files[0],
      });
    }
  },
});

registerCommand({
  id: 'file.import',
  category: __t('command.file', { defaultMessage: 'File' }),
  name: __t('command.file.import', { defaultMessage: 'Import data' }),
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
  category: __t('command.view', { defaultMessage: 'View' }),
  name: __t('command.view.reset', { defaultMessage: 'Reset view' }),
  onClick: () => {
    const keys = [
      'leftPanelWidth',
      'rightPanelWidth',
      'selectedWidget',
      'currentThemeType',
      'currentThemeVariables',

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
    showSnackbarSuccess(
      _t('command.view.restart', { defaultMessage: 'Restart DbGate (or reload on web) for applying changes' })
    );
  },
});

registerCommand({
  id: 'sql.generator',
  category: __t('command.sql', { defaultMessage: 'SQL' }),
  name: __t('command.sql.generator', { defaultMessage: 'SQL Generator' }),
  toolbar: true,
  icon: 'icon sql-generator',
  testEnabled: () =>
    getCurrentDatabase() != null &&
    hasPermission(`dbops/sql-generator`) &&
    findEngineDriver(getCurrentDatabase()?.connection, getExtensions())?.databaseEngineTypes?.includes('sql'),
  onClick: () =>
    showModal(SqlGeneratorModal, {
      conid: getCurrentDatabase()?.connection?._id,
      database: getCurrentDatabase()?.name,
    }),
});

registerCommand({
  id: 'database.export',
  category: __t('command.database', { defaultMessage: 'Database' }),
  name: __t('command.database.export', { defaultMessage: 'Export database' }),
  toolbar: true,
  icon: 'icon export',
  testEnabled: () => getCurrentDatabase() != null && hasPermission(`dbops/export`),
  onClick: () => {
    openImportExportTab({
      targetStorageType: getDefaultFileFormat(getExtensions()).storageType,
      sourceStorageType: 'database',
      sourceConnectionId: getCurrentDatabase()?.connection?._id,
      sourceDatabaseName: getCurrentDatabase()?.name,
    });
  },
});

if (isProApp()) {
  registerCommand({
    id: 'database.compare',
    category: __t('command.database', { defaultMessage: 'Database' }),
    name: __t('command.database.compare', { defaultMessage: 'Compare databases' }),
    toolbar: true,
    icon: 'icon compare',
    testEnabled: () =>
      getCurrentDatabase() != null &&
      findEngineDriver(getCurrentDatabase()?.connection, getExtensions())?.databaseEngineTypes?.includes('sql') &&
      hasPermission(`dbops/export`),
    onClick: () => {
      openNewTab(
        {
          title: 'Compare',
          icon: 'img compare',
          tabComponent: 'CompareModelTab',
          props: {
            conid: getCurrentDatabase()?.connection?._id,
            database: getCurrentDatabase()?.name,
          },
        },
        {
          editor: {
            sourceConid: getCurrentDatabase()?.connection?._id,
            sourceDatabase: getCurrentDatabase()?.name,
            targetConid: getCurrentDatabase()?.connection?._id,
            targetDatabase: getCurrentDatabase()?.name,
          },
        }
      );
    },
  });

  registerCommand({
    id: 'database.chat',
    category: __t('command.database', { defaultMessage: 'Database' }),
    name: __t('command.database.chat', { defaultMessage: 'Database chat' }),
    toolbar: true,
    icon: 'icon ai',
    testEnabled: () =>
      getCurrentDatabase() != null &&
      findEngineDriver(getCurrentDatabase()?.connection, getExtensions())?.databaseEngineTypes?.includes('sql') &&
      hasPermission('dbops/chat'),
    onClick: () => {
      openNewTab({
        title: 'Chat',
        icon: 'img ai',
        tabComponent: 'DatabaseChatTab',
        props: {
          conid: getCurrentDatabase()?.connection?._id,
          database: getCurrentDatabase()?.name,
        },
      });
    },
  });
}

if (hasPermission('settings/change')) {
  registerCommand({
    id: 'settings.settingsTab',
    category: __t('command.settings', { defaultMessage: 'Settings' }),
    name: __t('command.settings.settingsTab', { defaultMessage: 'Settings tab' }),
    onClick: () => {
      openNewTab({
        title: _t('command.settings.settingsTab', { defaultMessage: 'Settings tab' }),
        icon: 'icon settings',
        tabComponent: 'SettingsTab',
        props: {},
      });
    },
  });
  registerCommand({
    id: 'settings.commands',
    category: __t('command.settings', { defaultMessage: 'Settings' }),
    name: __t('command.settings.shortcuts', { defaultMessage: 'Keyboard shortcuts' }),
    onClick: () => {
      openNewTab({
        title: _t('command.settings.shortcuts', { defaultMessage: 'Keyboard shortcuts' }),
        icon: 'icon keyboard',
        tabComponent: 'CommandListTab',
        props: {},
      });
    },
    testEnabled: () => hasPermission('settings/change'),
  });

  // registerCommand({
  //   id: 'settings.show',
  //   category: __t('command.settings', { defaultMessage: 'Settings' }),
  //   name: __t('command.settings.change', { defaultMessage: 'Change' }),
  //   toolbarName: __t('command.settings', { defaultMessage: 'Settings' }),
  //   onClick: () => showModal(SettingsModal),
  //   testEnabled: () => hasPermission('settings/change'),
  // });
}

registerCommand({
  id: 'cloud.logout',
  category: __t('command.cloud', { defaultMessage: 'Cloud' }),
  name: __t('command.cloud.logout', { defaultMessage: 'Logout' }),
  onClick: () => {
    cloudSigninTokenHolder.set(null);
  },
});

registerCommand({
  id: 'file.exit',
  category: __t('command.file', { defaultMessage: 'File' }),
  name: isMac()
    ? __t('command.file.quit', { defaultMessage: 'Quit' })
    : __t('command.file.exit', { defaultMessage: 'Exit' }),
  // keyText: isMac() ? 'Command+Q' : null,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('quit-app'),
});

registerCommand({
  id: 'app.logout',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.app.logout', { defaultMessage: 'Logout' }),
  testEnabled: () => getCurrentConfig()?.isUserLoggedIn,
  onClick: doLogout,
});

registerCommand({
  id: 'app.loggedUserCommands',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.app.loggedUser', { defaultMessage: 'Logged user' }),
  getSubCommands: () => {
    const config = getCurrentConfig();
    if (!config) return [];
    return [
      {
        text: 'Logout',
        onClick: () => {
          doLogout();
        },
      },
    ];
  },
});

registerCommand({
  id: 'app.disconnect',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.app.disconnect', { defaultMessage: 'Disconnect' }),
  testEnabled: () => getCurrentConfig()?.singleConnection != null && !getCurrentConfig()?.isUserLoggedIn,
  onClick: () => disconnectServerConnection(getCurrentConfig()?.singleConnection?._id),
});

registerCommand({
  id: 'app.checkForUpdates',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.app.checkForUpdates', { defaultMessage: 'Check for updates' }),
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
  defaultTeamFolder = false,
}) {
  if (save) {
    registerCommand({
      id: idPrefix + '.save',
      group: 'save',
      category,
      name: __t('command.save', { defaultMessage: 'Save' }),
      // keyText: 'CtrlOrCommand+S',
      icon: 'icon save',
      toolbar: true,
      isRelatedToTab: true,
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => saveTabFile(getCurrentEditor(), 'save', folder, format, fileExtension, defaultTeamFolder),
    });
    registerCommand({
      id: idPrefix + '.saveAs',
      group: 'saveAs',
      category,
      name: __t('command.saveAs', { defaultMessage: 'Save As' }),
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => saveTabFile(getCurrentEditor(), 'save-as', folder, format, fileExtension, defaultTeamFolder),
    });
    registerCommand({
      id: idPrefix + '.saveToDisk',
      category,
      name: __t('command.saveToDisk', { defaultMessage: 'Save to disk' }),
      testEnabled: () => getCurrentEditor() != null && getElectron() != null,
      onClick: () => saveTabFile(getCurrentEditor(), 'save-to-disk', folder, format, fileExtension, defaultTeamFolder),
    });
  }

  if (execute) {
    registerCommand({
      id: idPrefix + '.execute',
      category,
      name: __t('command.execute', { defaultMessage: 'Execute' }),
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
      name: __t('command.kill', { defaultMessage: 'Kill' }),
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
      name: __t('command.toggleComment', { defaultMessage: 'Toggle comment' }),
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
      name: __t('command.copy', { defaultMessage: 'Copy' }),
      disableHandleKeyText: 'CtrlOrCommand+C',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().copy(),
    });
    registerCommand({
      id: idPrefix + '.paste',
      category,
      name: __t('command.paste', { defaultMessage: 'Paste' }),
      disableHandleKeyText: 'CtrlOrCommand+V',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().paste(),
    });
  }

  if (findReplace) {
    registerCommand({
      id: idPrefix + '.find',
      category,
      name: __t('command.find', { defaultMessage: 'Find' }),
      keyText: 'CtrlOrCommand+F',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().find(),
    });
    registerCommand({
      id: idPrefix + '.replace',
      category,
      keyText: isMac() ? 'Alt+Command+F' : 'CtrlOrCommand+H',
      name: __t('command.replace', { defaultMessage: 'Replace' }),
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().replace(),
    });
  }
  if (undoRedo) {
    registerCommand({
      id: idPrefix + '.undo',
      category,
      name: __t('command.undo', { defaultMessage: 'Undo' }),
      group: 'undo',
      icon: 'icon undo',
      testEnabled: () => getCurrentEditor()?.canUndo(),
      onClick: () => getCurrentEditor().undo(),
    });
    registerCommand({
      id: idPrefix + '.redo',
      category,
      group: 'redo',
      name: __t('command.redo', { defaultMessage: 'Redo' }),
      icon: 'icon redo',
      testEnabled: () => getCurrentEditor()?.canRedo(),
      onClick: () => getCurrentEditor().redo(),
    });
  }
}

registerCommand({
  id: 'app.minimize',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.minimize', { defaultMessage: 'Minimize' }),
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'minimize'),
});

registerCommand({
  id: 'app.maximize',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.maximize', { defaultMessage: 'Maximize' }),
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'maximize'),
});

registerCommand({
  id: 'app.toggleFullScreen',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.toggleFullScreen', { defaultMessage: 'Toggle full screen' }),
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
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.toggleDevTools', { defaultMessage: 'Toggle Dev Tools' }),
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'devtools'),
});

registerCommand({
  id: 'app.reload',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.reload', { defaultMessage: 'Reload' }),
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'reload'),
});

registerCommand({
  id: 'app.openDocs',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.documentation', { defaultMessage: 'Documentation' }),
  onClick: () => openWebLink('https://docs.dbgate.io/'),
});

registerCommand({
  id: 'app.openWeb',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.web', { defaultMessage: 'DbGate web' }),
  onClick: () => openWebLink('https://www.dbgate.io/'),
});

registerCommand({
  id: 'app.openIssue',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.openIssue', { defaultMessage: 'Report problem or feature request' }),
  onClick: () => openWebLink('https://github.com/dbgate/dbgate/issues/new'),
});

registerCommand({
  id: 'app.openSponsoring',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.becomeSponsor', { defaultMessage: 'Become sponsor' }),
  testEnabled: () => !isProApp(),
  onClick: () => openWebLink('https://opencollective.com/dbgate'),
});

// registerCommand({
//   id: 'app.giveFeedback',
//   category: 'Application',
//   name: 'Give us feedback',
//   onClick: () => openWebLink('https://dbgate.org/feedback'),
// });

registerCommand({
  id: 'app.zoomIn',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.zoomIn', { defaultMessage: 'Zoom in' }),
  keyText: 'CtrlOrCommand+=',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'zoomin'),
});

registerCommand({
  id: 'app.zoomOut',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.zoomOut', { defaultMessage: 'Zoom out' }),
  keyText: 'CtrlOrCommand+-',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'zoomout'),
});

registerCommand({
  id: 'app.zoomReset',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.zoomReset', { defaultMessage: 'Reset zoom' }),
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'zoomreset'),
});

registerCommand({
  id: 'edit.undo',
  category: __t('command.edit', { defaultMessage: 'Edit' }),
  name: __t('command.edit.undo', { defaultMessage: 'Undo' }),
  keyText: 'CtrlOrCommand+Z',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'undo'),
});

registerCommand({
  id: 'edit.redo',
  category: __t('command.edit', { defaultMessage: 'Edit' }),
  name: __t('command.edit.redo', { defaultMessage: 'Redo' }),
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'redo'),
});

registerCommand({
  id: 'edit.cut',
  category: __t('command.edit', { defaultMessage: 'Edit' }),
  name: __t('command.edit.cut', { defaultMessage: 'Cut' }),
  keyText: 'CtrlOrCommand+X',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'cut'),
});

registerCommand({
  id: 'edit.copy',
  category: __t('command.edit', { defaultMessage: 'Edit' }),
  name: __t('command.edit.copy', { defaultMessage: 'Copy' }),
  keyText: 'CtrlOrCommand+C',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'copy'),
});

registerCommand({
  id: 'edit.paste',
  category: __t('command.edit', { defaultMessage: 'Edit' }),
  name: __t('command.edit.paste', { defaultMessage: 'Paste' }),
  keyText: 'CtrlOrCommand+V',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'paste'),
});

registerCommand({
  id: 'edit.selectAll',
  category: __t('command.edit', { defaultMessage: 'Edit' }),
  name: __t('command.edit.selectAll', { defaultMessage: 'Select All' }),
  keyText: 'CtrlOrCommand+A',
  systemCommand: true,
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'selectAll'),
});

registerCommand({
  id: 'app.unsetCurrentDatabase',
  category: __t('command.application', { defaultMessage: 'Application' }),
  name: __t('command.application.unsetCurrentDatabase', { defaultMessage: 'Unset current database' }),
  testEnabled: () => getCurrentDatabase() != null,
  onClick: () => currentDatabase.set(null),
});

let loadedCampaignList = [];

registerCommand({
  id: 'internal.loadCampaigns',
  category: __t('command.internal', { defaultMessage: 'Internal' }),
  name: __t('command.internal.loadCampaigns', { defaultMessage: 'Load campaign list' }),
  testEnabled: () => getBoolSettingsValue('internal.showCampaigns', false),
  onClick: async () => {
    const resp = await apiCall('cloud/promo-widget-list', {});
    loadedCampaignList = resp;
  },
});

registerCommand({
  id: 'internal.showCampaigns',
  category: __t('command.internal', { defaultMessage: 'Internal' }),
  name: __t('command.internal.showCampaigns', { defaultMessage: 'Show campaigns' }),
  testEnabled: () => getBoolSettingsValue('internal.showCampaigns', false) && loadedCampaignList?.length > 0,
  getSubCommands: () => {
    return loadedCampaignList.map(campaign => ({
      text: `${campaign.campaignName} (${campaign.countries || 'Global'}) - #${campaign.quantileRank ?? '*'}/${
        campaign.quantileGroupCount ?? '*'
      } - ${campaign.variantIdentifier}`,
      onClick: async () => {
        promoWidgetPreview.set(
          await apiCall('cloud/promo-widget-preview', {
            campaign: campaign.campaignIdentifier,
            variant: campaign.variantIdentifier,
          })
        );
      },
    }));
  },
});

if (hasPermission('application-log')) {
  registerCommand({
    id: 'app.showLogs',
    category: __t('command.application', { defaultMessage: 'Application' }),
    name: __t('command.application.showLogs', { defaultMessage: 'View application logs' }),
    onClick: () => {
      openNewTab({
        title: 'Application log',
        icon: 'img applog',
        tabComponent: 'AppLogTab',
      });
    },
  });
}

if (hasPermission('widgets/plugins')) {
  registerCommand({
    id: 'app.managePlugins',
    category: __t('command.application', { defaultMessage: 'Application' }),
    name: __t('command.application.managePlugins', { defaultMessage: 'Manage plugins' }),
    onClick: () => {
      selectedWidget.set('plugins');
      visibleWidgetSideBar.set(true);
    },
  });
}

const electron = getElectron();
if (electron) {
  electron.addEventListener('run-command', (e, commandId) => runCommand(commandId));
}
