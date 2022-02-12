module.exports = [
  {
    label: 'File',
    submenu: [
      { command: 'new.connection', hideDisabled: true },
      { command: 'new.sqliteDatabase', hideDisabled: true },
      { divider: true },
      { command: 'file.open', hideDisabled: true },
      { command: 'file.openArchive', hideDisabled: true },
      { divider: true },
      { command: 'group.save', hideDisabled: true },
      { command: 'group.saveAs', hideDisabled: true },
      { command: 'database.search', hideDisabled: true },
      { divider: true },
      { command: 'file.exit', hideDisabled: true },
    ],
  },
  {
    label: 'Window',
    submenu: [
      { command: 'new.query', hideDisabled: true },
      { command: 'new.modelCompare', hideDisabled: true },
      { command: 'new.freetable', hideDisabled: true },
      { divider: true },
      { command: 'tabs.closeTab', hideDisabled: true },
      { command: 'tabs.closeAll', hideDisabled: true },
    ],
  },

  // {
  //   label: 'Edit',
  //   submenu: [
  //     { role: 'undo' },
  //     { role: 'redo' },
  //     { type: 'separator' },
  //     { role: 'cut' },
  //     { role: 'copy' },
  //     { role: 'paste' },
  //   ],
  // },
  {
    label: 'View',
    submenu: [
      { command: 'app.reload', hideDisabled: true },
      { command: 'app.toggleDevTools', hideDisabled: true },
      { command: 'app.toggleFullScreen', hideDisabled: true },
      { command: 'app.minimize', hideDisabled: true },
      { divider: true },
      { command: 'theme.changeTheme', hideDisabled: true },
      { command: 'settings.show' },
    ],
  },
  {
    label: 'Help',
    submenu: [
      { command: 'app.openDocs', hideDisabled: true },
      { command: 'app.openWeb', hideDisabled: true },
      { command: 'app.openIssue', hideDisabled: true },
      { command: 'app.openSponsoring', hideDisabled: true },
      { divider: true },
      { command: 'tabs.changelog', hideDisabled: true },
      { command: 'about.show', hideDisabled: true },
    ],
  },
];
