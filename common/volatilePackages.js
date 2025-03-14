// these packages will be never bundled with webpack

const volatilePackages = [
  '@clickhouse/client',
  'bson', // this package is already bundled and is used in mongodb
  'mongodb',
  'mongodb-client-encryption',
  'tedious',
  'msnodesqlv8',
  'mysql2',
  'oracledb',
  'pg-copy-streams',
  'pg',
  'ioredis',
  'node-redis-dump2',
  'better-sqlite3',
  'libsql',
  '@azure/cosmos',
  '@aws-sdk/rds-signer',
  'activedirectory2',
  'axios',
  'ssh2',
  'wkx',
];

module.exports = volatilePackages;
