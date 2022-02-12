module.exports = [
  {
    label: 'File',
    submenu: [
      { command: 'new.connection' },
      { command: 'new.sqliteDatabase' },
      { divider: true },
      { command: 'file.open' },
      { command: 'file.openArchive' },
      { divider: true },
      { command: 'group.save' },
      { command: 'group.saveAs' },
      { command: 'database.search' },
      { divider: true },

      { command: 'file.exit' },
    ],
  },
  {
    label: 'Window',
    submenu: [
      { command: 'new.query' },
      { command: 'new.modelCompare' },
      { command: 'new.freetable' },
      { divider: true },
      { command: 'tabs.closeTab' },
      { command: 'tabs.closeAll' },
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
      { command: 'app.reload' },
      { command: 'app.toggleDevTools' },
      { command: 'app.toggleFullScreen' },
      { command: 'app.minimize' },
      { command: 'theme.changeTheme' },
    ],
  },
  {
    label: 'help',
    submenu: [
      { command: 'app.openDocs' },
      { command: 'app.openWeb' },
      { command: 'app.openIssue' },
      { command: 'app.openSponsoring' },
      { divider: true },
      { command: 'tabs.changelog' },
      { command: 'about.show' },
    ],
  },
];
