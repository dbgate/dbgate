const { driverBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const Dumper = require('./Dumper');
const { firebirdSplitterOptions } = require('dbgate-query-splitter/lib/options');
const firebirdIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="353" height="353" viewBox="0 0 353 353">
  <defs>
    <linearGradient id="fbgrad1" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#F40A0B;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#F5E710;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="fbgrad2" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#F40A0B;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#F5E710;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <path fill="url(#fbgrad1)" d="M79.704,273.88c3.24,25.704,17.208,45.072,38.592,64.08l-7.704-3.888C49.824,307.936,7.344,247.527,7.344,177.256c0-89.28,68.904-163.512,158.04-170.136C76.248,13.744,7.344,87.976,7.344,177.256c0-89.28,68.904-163.512,158.04-170.136C63.288,27.28-34.56,145.216,79.704,273.88z"/>
  <path fill="url(#fbgrad2)" d="M312.769,122.896C305.064,67.672,262.656,29.008,185.4,6.832c91.152,4.032,163.081,79.2,163.081,170.424c0,94.248-70.992,167.112-163.225,171.288c-8.712,0.433-17.424-1.08-25.92-3.744V152.56c2.808-4.248,2.808-8.496,0-12.744V98.92h9.432c-3.672-2.448-6.768-4.32-9.432-5.472V81.64c49.464,18.864,72.433,21.024,68.977,6.264c4.319,12.168,0.576,17.712-11.232,16.488c-13.608-2.088-22.032-1.152-25.344,2.88c24.408,12.096,37.44,23.832,39.096,35.208c2.304,19.152-6.768,40.248-27.216,63.36c-12.888,16.057-6.192,33.12,14.616,35.855C282.815,238.527,314.353,198.856,312.769,122.896z M159.336,344.8c-19.728-6.119-37.44-18.432-46.08-27c-15.264-15.84-25.632-41.184-29.448-77.76c0-0.216-0.072-0.433-0.072-0.647v-12.385c2.376-29.376,21.96-50.04,58.896-61.92c8.352-4.104,13.968-8.28,16.704-12.528V344.8z M159.336,139.816c-1.152-1.872-2.952-3.744-5.184-5.688c-2.016-2.016-6.336-4.032-12.888-5.976c-14.976-0.432-23.112,3.312-24.408,11.304c-25.416-11.304-26.136-24.192-2.232-38.592c4.68-1.8,11.52-2.448,20.592-2.088c-3.744-16.56,2.592-22.968,19.08-19.08c1.728,0.648,3.384,1.296,5.04,1.944v11.808c-7.56-3.528-10.512-1.728-8.928,5.472h8.928V139.816z"/>
</svg>`;

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  rangeSelect: true,
  ilike: true,
  multipleSchema: false,
  stringEscapeChar: "'",
  fallbackDataType: 'varchar(256)',
  anonymousPrimaryKey: false,
  enableConstraintsPerTable: true,
  stringAgg: true,
  offsetFirstSkipSyntax: true,
  dropColumnDependencies: ['dependencies', 'primaryKeys', 'foreignKeys', 'indexes', 'uniques'],
  changeColumnDependencies: ['dependencies', 'primaryKeys', 'indexes', 'uniques'],
  renameColumnDependencies: ['dependencies', 'foreignKeys', 'uniques'],
  defaultValueBeforeNullability: true,
  useServerDatabaseFile: true,
  maxIdentifierLength: 31,

  quoteIdentifier(s) {
    return `"${s}"`;
  },

  dbFileExtension: '.fdb',

  implicitNullDeclaration: true,
  createColumn: true,
  dropColumn: true,
  changeColumn: true,
  createIndex: true,
  dropIndex: true,
  createForeignKey: true,
  dropForeignKey: true,
  createPrimaryKey: true,
  dropPrimaryKey: true,
  createUnique: true,
  dropUnique: true,
  createCheck: true,
  dropCheck: true,
  allowMultipleValuesInsert: false,
  renameSqlObject: true,
  filteredIndexes: true,
  disableRenameTable: true,
};

/** @type {import('dbgate-types').EngineDriver} */
const firebirdDriverBase = {
  ...driverBase,
  defaultPort: 3050,
  icon: firebirdIcon,
  showConnectionField: field => ['port', 'user', 'password', 'server', 'databaseFile'].includes(field),

  getQuerySplitterOptions: (usage) =>
    usage == 'editor'
      ? { ...firebirdSplitterOptions, ignoreComments: true, preventSingleLineSplit: true }
      : firebirdSplitterOptions,

  beforeConnectionSave: connection => {
    const { databaseFile } = connection;
    return {
      ...connection,
      singleDatabase: true,
      defaultDatabase: databaseFile,
    };
  },

  adaptDataType(dataType) {
    if (dataType?.toLowerCase() == 'datetime') return 'TIMESTAMP';
    if (dataType?.toLowerCase() == 'text') return 'BLOB SUB_TYPE 1 CHARACTER SET UTF8';
    return dataType;
  },

  engine: 'firebird@dbgate-plugin-firebird',
  title: 'Firebird',
  supportsTransactions: true,
  dumperClass: Dumper,
  dialect,
};

module.exports = firebirdDriverBase;
