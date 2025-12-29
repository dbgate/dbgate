// @ts-check

const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');
const { sqliteSplitterOptions, noSplitSplitterOptions } = require('dbgate-query-splitter/lib/options');
const sqlLiteIcon = '<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sqlite-original-a" x1="-15.615" x2="-6.741" y1="-9.108" y2="-9.108" gradientTransform="rotate(90 -90.486 64.634) scale(9.2712)" gradientUnits="userSpaceOnUse"><stop stop-color="#95d7f4" offset="0"/><stop stop-color="#0f7fcc" offset=".92"/><stop stop-color="#0f7fcc" offset="1"/></linearGradient></defs><path d="M69.5 99.176c-.059-.73-.094-1.2-.094-1.2S67.2 83.087 64.57 78.642c-.414-.707.043-3.594 1.207-7.88.68 1.169 3.54 6.192 4.118 7.81.648 1.824.78 2.347.78 2.347s-1.57-8.082-4.144-12.797a162.286 162.286 0 012.004-6.265c.973 1.71 3.313 5.859 3.828 7.3.102.293.192.543.27.774.023-.137.05-.274.074-.414-.59-2.504-1.75-6.86-3.336-10.082 3.52-18.328 15.531-42.824 27.84-53.754H16.9c-5.387 0-9.789 4.406-9.789 9.789v88.57c0 5.383 4.406 9.789 9.79 9.789h52.897a118.657 118.657 0 01-.297-14.652" fill="#0b7fcc"/><path d="M65.777 70.762c.68 1.168 3.54 6.188 4.117 7.809.649 1.824.781 2.347.781 2.347s-1.57-8.082-4.144-12.797a164.535 164.535 0 012.004-6.27c.887 1.567 2.922 5.169 3.652 6.872l.082-.961c-.648-2.496-1.633-5.766-2.898-8.328 3.242-16.871 13.68-38.97 24.926-50.898H16.899a6.94 6.94 0 00-6.934 6.933v82.11c17.527-6.731 38.664-12.88 56.855-12.614-.672-2.605-1.441-4.96-2.25-6.324-.414-.707.043-3.597 1.207-7.879" fill="url(#sqlite-original-a)"/><path d="M115.95 2.781c-5.5-4.906-12.164-2.933-18.734 2.899a44.347 44.347 0 00-2.914 2.859c-11.25 11.926-21.684 34.023-24.926 50.895 1.262 2.563 2.25 5.832 2.894 8.328.168.64.32 1.242.442 1.754.285 1.207.437 1.996.437 1.996s-.101-.383-.515-1.582c-.078-.23-.168-.484-.27-.773-.043-.125-.105-.274-.172-.434-.734-1.703-2.765-5.305-3.656-6.867-.762 2.25-1.437 4.36-2.004 6.265 2.578 4.715 4.149 12.797 4.149 12.797s-.137-.523-.782-2.347c-.578-1.621-3.441-6.64-4.117-7.809-1.164 4.281-1.625 7.172-1.207 7.88.809 1.362 1.574 3.722 2.25 6.323 1.524 5.867 2.586 13.012 2.586 13.012s.031.469.094 1.2a118.653 118.653 0 00.297 14.651c.504 6.11 1.453 11.363 2.664 14.172l.828-.449c-1.781-5.535-2.504-12.793-2.188-21.156.48-12.793 3.422-28.215 8.856-44.289 9.191-24.27 21.938-43.738 33.602-53.035-10.633 9.602-25.023 40.684-29.332 52.195-4.82 12.891-8.238 24.984-10.301 36.574 3.55-10.863 15.047-15.53 15.047-15.53s5.637-6.958 12.227-16.888c-3.95.903-10.43 2.442-12.598 3.352-3.2 1.344-4.067 1.8-4.067 1.8s10.371-6.312 19.27-9.171c12.234-19.27 25.562-46.648 12.141-58.621" fill="#003956"/></svg>';
const libSqlIcon = '<svg id="Layer_3" data-name="Layer 3" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 217.2 217.2"><defs><style>.cls-1{fill:#79ac91}.cls-1,.cls-2,.cls-3,.cls-4{stroke-width:0}.cls-2{fill:#72f5cf}.cls-3{fill:#141b1f}.cls-4{fill:#a8f7d9}</style></defs><path class="cls-2" d="M118,87.2c.7,0,1.3,0,1.9.3.4.1.8.3,1.2.5.2.1.4.2.6.3.4.3.7.5,1.1.9l5.2,5.2c2.7,2.7,2.7,7,0,9.7l-95.1,95.1c-1.3,1.3-3.1,2-4.8,2s-3.5-.7-4.8-2l-5.2-5.2c-2.7-2.7-2.7-7,0-9.7l85.1-85.1,10-10c.3-.3.7-.6,1.1-.9.2-.1.4-.2.6-.3.4-.2.8-.4,1.2-.5.6-.2,1.3-.3,1.9-.3M118,71.2c-2.2,0-4.4.3-6.5.9-1.4.4-2.8,1-4.1,1.7-.7.4-1.3.7-2,1.2-1.3.8-2.5,1.8-3.6,2.9l-10,10L6.7,173c-8.9,8.9-8.9,23.4,0,32.3l5.2,5.2c4.3,4.3,10.1,6.7,16.2,6.7s11.8-2.4,16.2-6.7l95.1-95.1c4.3-4.3,6.7-10.1,6.7-16.2s-2.4-11.8-6.7-16.2l-5.2-5.2c-1.1-1.1-2.3-2.1-3.6-2.9-.6-.4-1.3-.8-1.9-1.2-1.3-.7-2.7-1.3-4.1-1.7-2.1-.6-4.3-.9-6.5-.9Z"/><g><path class="cls-2" d="M119.4,16c.3,0,.6,0,.9,0l66.5,3.8c5.8.3,10.3,4.9,10.7,10.7l3.8,66.5c.3,4.4-1.4,8.7-4.5,11.8l-79.7,79.7c-3,3-6.9,4.5-11,4.5s-3.3-.3-4.9-.8l-49.9-16.5c-4.7-1.5-8.3-5.2-9.8-9.8l-16.5-49.9c-1.8-5.6-.4-11.7,3.8-15.8L108.4,20.5c2.9-2.9,6.9-4.5,11-4.5M119.4,0c-8.4,0-16.3,3.3-22.3,9.2L17.4,88.9c-8.5,8.5-11.4,20.8-7.6,32.1l16.5,49.9c3.1,9.4,10.6,16.9,20,20l49.9,16.5c3.2,1.1,6.5,1.6,9.9,1.6,8.4,0,16.3-3.3,22.3-9.2l79.7-79.7c6.3-6.3,9.7-15.1,9.2-24.1l-3.8-66.5c-.8-13.9-11.9-24.9-25.7-25.7L121.2,0c-.6,0-1.2,0-1.8,0Z"/><path class="cls-4" d="M24.9,116.1l16.5,49.9c1.5,4.7,5.2,8.3,9.8,9.8l49.9,16.5c5.6,1.8,11.7.4,15.8-3.8l79.7-79.7c3.1-3.1,4.8-7.4,4.5-11.8l-3.8-66.5c-.3-5.8-4.9-10.3-10.7-10.7l-66.5-3.8c-4.4-.3-8.7,1.4-11.8,4.5L28.7,100.3c-4.1,4.1-5.6,10.3-3.8,15.8Z"/><path class="cls-3" d="M119.4,16c.3,0,.6,0,.9,0l66.5,3.8c5.8.3,10.3,4.9,10.7,10.7l3.8,66.5c.3,4.4-1.4,8.7-4.5,11.8l-79.7,79.7c-3,3-6.9,4.5-11,4.5s-3.3-.3-4.9-.8l-49.9-16.5c-4.7-1.5-8.3-5.2-9.8-9.8l-16.5-49.9c-1.8-5.6-.4-11.7,3.8-15.8L108.4,20.5c2.9-2.9,6.9-4.5,11-4.5M119.4,6c-6.8,0-13.2,2.7-18,7.5L21.6,93.2c-6.8,6.8-9.2,16.8-6.2,26l16.5,49.9c2.5,7.6,8.6,13.7,16.2,16.2l49.9,16.5c2.6.9,5.3,1.3,8,1.3,6.8,0,13.2-2.7,18-7.5l79.7-79.7c5.1-5.1,7.8-12.2,7.4-19.5l-3.8-66.5c-.6-10.8-9.3-19.5-20.1-20.1l-66.5-3.8c-.5,0-1,0-1.5,0Z"/><path class="cls-3" d="M136.7,173.7l6.9-6.9c-.2-.1-.4-.2-.6-.3l-27.6-9.1-6.9,6.9,28.3,9.3Z"/><path class="cls-3" d="M166.5,143.9l6.9-6.9c-.2-.1-.4-.2-.6-.3l-27.6-9.1-6.9,6.9,28.3,9.3Z"/><path class="cls-3" d="M43.5,80.5l6.9-6.9c.1.2.2.4.3.6l9.1,27.6-6.9,6.9-9.3-28.3Z"/><path class="cls-3" d="M73.3,50.7l6.9-6.9c.1.2.2.4.3.6l9.1,27.6-6.9,6.9-9.3-28.3Z"/></g><path class="cls-1" d="M130.6,101.5l-97.7,97.7c-2.7,2.7-7,2.7-9.7,0l-5.2-5.2c-2.7-2.7-2.7-7,0-9.7l97.7-97.7c1.5-1.5,3.4-2.4,5.5-2.6l7.9-.8c2.8-.3,5.1,2.1,4.9,4.9l-.8,7.9c-.2,2.1-1.1,4-2.6,5.5Z"/><path class="cls-3" d="M129.5,83.3c2.6,0,4.7,2.2,4.4,4.9l-.8,7.9c-.2,2.1-1.1,4-2.6,5.5l-97.7,97.7c-1.3,1.3-3.1,2-4.8,2s-3.5-.7-4.8-2l-5.2-5.2c-2.7-2.7-2.7-7,0-9.7l97.7-97.7c1.5-1.5,3.4-2.4,5.5-2.6l7.9-.8c.1,0,.3,0,.4,0M129.5,73.3h0c-.5,0-.9,0-1.4,0l-7.9.8c-4.4.4-8.5,2.4-11.5,5.5L10.9,177.3c-6.6,6.6-6.6,17.3,0,23.8l5.2,5.2c3.2,3.2,7.4,4.9,11.9,4.9s8.7-1.8,11.9-4.9l97.7-97.7c3.1-3.1,5-7.2,5.5-11.5l.8-7.9c.4-4-.9-8.1-3.7-11.1-2.7-3-6.6-4.7-10.7-4.7h0Z"/></svg>';

function getDatabaseFileLabel(databaseFile) {
  if (!databaseFile) return databaseFile;
  const m = databaseFile.match(/[\/]([^\/]+)$/);
  if (m) return m[1];
  return databaseFile;
}

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: false,
  explicitDropConstraint: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar',
  allowMultipleValuesInsert: true,
  dropColumnDependencies: ['indexes', 'primaryKey', 'uniques'],
  quoteIdentifier(s) {
    return `[${s}]`;
  },
  anonymousPrimaryKey: true,
  requireStandaloneSelectForScopeIdentity: true,

  createColumn: true,
  dropColumn: true,
  createIndex: true,
  dropIndex: true,
  createForeignKey: false,
  enableForeignKeyChecks: false,
  dropForeignKey: false,
  createPrimaryKey: false,
  dropPrimaryKey: false,
  dropReferencesWhenDropTable: false,
  filteredIndexes: true,
  anonymousForeignKey: true,
};

/** @type {import('dbgate-types').EngineDriver} */
const sqliteDriverBase = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  readOnlySessions: true,
  supportsTransactions: true,
  supportsIncrementalAnalysis: true,

  getQuerySplitterOptions: (usage) =>
    usage == 'editor'
      ? { ...sqliteSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : usage == 'stream'
      ? noSplitSplitterOptions
      : sqliteSplitterOptions,
  showConnectionTab: (field) => false,

  predefinedDataTypes: ['integer', 'real', 'text', 'blob'],
  icon: sqlLiteIcon,
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...sqliteDriverBase,
  engine: 'sqlite@dbgate-plugin-sqlite',
  title: 'SQLite',
  showConnectionField: (field, values) => field == 'databaseFile' || field == 'isReadOnly',
  beforeConnectionSave: (connection) => ({
    ...connection,
    singleDatabase: true,
    defaultDatabase: getDatabaseFileLabel(connection.databaseFile),
  }),

  // isFileDatabase: true,
  // isElectronOnly: true,
};

/** @type {import('dbgate-types').EngineDriver} */
const libsqlDriver = {
  ...sqliteDriverBase,
  engine: 'libsql@dbgate-plugin-sqlite',
  title: 'LibSQL',
  authTypeLabel: 'Target type',
  authTypeFirst: true,
  premiumOnly: true,
  icon: libSqlIcon,
  showConnectionField: (field, values) => {
    if ((values?.authType ?? 'url') === 'url') {
      return ['databaseUrl', 'authToken', 'isReadOnly', 'authType'].includes(field);
    }
    if (['databaseFile', 'isReadOnly'].includes(field)) return true;
    if (field == 'authType') return true;
    return false;
  },

  defaultAuthTypeName: 'url',
  beforeConnectionSave: (connection) => ({
    ...connection,
    singleDatabase: true,
    defaultDatabase: getDatabaseFileLabel(connection.databaseFile || connection.databaseUrl),
  }),

  // isFileDatabase: true,
  // isElectronOnly: true,
};

module.exports = [driver, libsqlDriver];
