const { driverBase } = global.DBGATE_TOOLS;
const Dumper = require('./Dumper');

/** @type {import('dbgate-types').SqlDialect} */
const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
  quoteIdentifier(s) {
    return `[${s}]`;
  },
};

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  dumperClass: Dumper,
  dialect,
  engine: 'redis@dbgate-plugin-redis',
  title: 'Redis',
  defaultPort: 6379,

  showConnectionField: (field, values) => {
    return ['server', 'port', 'password'].includes(field);
  },
};

module.exports = driver;
