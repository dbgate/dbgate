function _t(key, { defaultMessage, currentTranslations } = {}) {
  return (currentTranslations || global.TRANSLATION_DATA)?.[key] || defaultMessage;
}

module.exports = ({ editMenu, isMac }, currentTranslations = null) => [
  {
    label: _t('menu.file', { defaultMessage: 'File', currentTranslations }),
    submenu: [
      { command: 'new.connection', hideDisabled: true },
      { command: 'new.sqliteDatabase', hideDisabled: true },
      { command: 'new.duckdbDatabase', hideDisabled: true },
      { divider: true },
      { command: 'new.query', hideDisabled: true },
      { command: 'new.queryDesign', hideDisabled: true },
      { command: 'new.diagram', hideDisabled: true },
      { command: 'new.perspective', hideDisabled: true },
      { command: 'new.application', hideDisabled: true },
      { command: 'new.shell', hideDisabled: true },
      { command: 'new.jsonl', hideDisabled: true },
      { command: 'new.modelTransform', hideDisabled: true },
      { divider: true },
      { command: 'file.open', hideDisabled: true },
      { command: 'file.openArchive', hideDisabled: true },
      { divider: true },
      { command: 'group.save', hideDisabled: true },
      { command: 'group.saveAs', hideDisabled: true },
      { divider: true },
      { command: 'file.exit', hideDisabled: true },
      { command: 'app.logout', hideDisabled: true, skipInApp: true },
      { command: 'app.disconnect', hideDisabled: true, skipInApp: true },
    ],
  },
  editMenu
    ? {
        label: _t('menu.edit', { defaultMessage: 'Edit', currentTranslations }),
        submenu: [
          { command: 'edit.undo' },
          { command: 'edit.redo' },
          { divider: true },
          { command: 'edit.cut' },
          { command: 'edit.copy' },
          { command: 'edit.paste' },
          { command: 'edit.selectAll' },
        ],
      }
    : null,

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
    label: _t('menu.view', { defaultMessage: 'View', currentTranslations }),
    submenu: [
      { command: 'app.reload', hideDisabled: true },
      { command: 'app.toggleDevTools', hideDisabled: true },
      { command: 'app.toggleFullScreen', hideDisabled: true },
      { command: 'app.minimize', hideDisabled: true },
      { command: 'toggle.sidebar' },
      { divider: true },
      { command: 'theme.changeTheme', hideDisabled: true },
      { command: 'settings.show' },
      { divider: true },
      { command: 'tabs.closeTab', hideDisabled: false },
      { command: 'tabs.closeAll', hideDisabled: false },
      { command: 'tabs.closeTabsWithCurrentDb', hideDisabled: false },
      { command: 'tabs.closeTabsButCurrentDb', hideDisabled: false },
      { divider: true },
      { command: 'app.zoomIn', hideDisabled: true },
      { command: 'app.zoomOut', hideDisabled: true },
      { command: 'app.zoomReset', hideDisabled: true },
    ],
  },
  {
    label: _t('menu.tools', { defaultMessage: 'Tools', currentTranslations }),
    submenu: [
      { command: 'database.search', hideDisabled: true },
      { command: 'commandPalette.show', hideDisabled: true },
      { command: 'database.switch', hideDisabled: true },
      { divider: true },
      { command: 'sql.generator', hideDisabled: true },
      { command: 'file.import', hideDisabled: true },
      { command: 'new.modelCompare', hideDisabled: true },
      { divider: true },
      { command: 'folder.showLogs', hideDisabled: true },
      { command: 'folder.showData', hideDisabled: true },
      { command: 'app.resetSettings', hideDisabled: true },
      { divider: true },
      { command: 'app.exportConnections', hideDisabled: true },
      { command: 'app.importConnections', hideDisabled: true },
    ],
  },
  ...(isMac
    ? [
        {
          role: 'window',
          submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
        },
      ]
    : []),
  {
    label: _t('menu.help', { defaultMessage: 'Help', currentTranslations }),
    submenu: [
      { command: 'app.openDocs', hideDisabled: true },
      { command: 'app.openWeb', hideDisabled: true },
      { command: 'app.openIssue', hideDisabled: true },
      { command: 'app.openSponsoring', hideDisabled: true },
      // { command: 'app.giveFeedback', hideDisabled: true },
      { divider: true },
      { command: 'settings.commands', hideDisabled: true },
      { command: 'tabs.changelog', hideDisabled: true },
      { command: 'about.show', hideDisabled: true },
      { divider: true },
      { command: 'file.checkForUpdates', hideDisabled: true },
    ],
  },
];
