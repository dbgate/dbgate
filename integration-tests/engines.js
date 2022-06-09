const views = {
  type: 'views',
  create1: 'CREATE VIEW obj1 AS SELECT id FROM t1',
  create2: 'CREATE VIEW obj2 AS SELECT id FROM t2',
  drop1: 'DROP VIEW obj1',
  drop2: 'DROP VIEW obj2',
};
const matviews = {
  type: 'matviews',
  create1: 'CREATE MATERIALIZED VIEW obj1 AS SELECT id FROM t1',
  create2: 'CREATE MATERIALIZED VIEW obj2 AS SELECT id FROM t2',
  drop1: 'DROP MATERIALIZED VIEW obj1',
  drop2: 'DROP MATERIALIZED VIEW obj2',
};

const engines = [
  {
    label: 'MySQL',
    connection: {
      engine: 'mysql@dbgate-plugin-mysql',
      password: 'Pwd2020Db',
      user: 'root',
      server: 'mysql',
      port: 3306,
    },
    local: {
      server: 'localhost',
      port: 15001,
    },
    // skipOnCI: true,
    objects: [views],
    dbSnapshotBySeconds: true,
  },
  {
    label: 'MariaDB',
    connection: {
      engine: 'mariadb@dbgate-plugin-mysql',
      password: 'Pwd2020Db',
      user: 'root',
      server: 'mysql',
      port: 3306,
    },
    local: {
      server: 'localhost',
      port: 15004,
    },
    skipOnCI: true,
    objects: [views],
    dbSnapshotBySeconds: true,
  },
  {
    label: 'PostgreSQL',
    connection: {
      engine: 'postgres@dbgate-plugin-postgres',
      password: 'Pwd2020Db',
      user: 'postgres',
      server: 'postgres',
      port: 5432,
    },
    local: {
      server: 'localhost',
      port: 15000,
    },
    objects: [
      views,
      matviews,
      {
        type: 'procedures',
        create1: 'CREATE PROCEDURE obj1() LANGUAGE SQL AS $$  select * from t1 $$',
        create2: 'CREATE PROCEDURE obj2() LANGUAGE SQL AS $$  select * from t2 $$',
        drop1: 'DROP PROCEDURE obj1',
        drop2: 'DROP PROCEDURE obj2',
      },
      {
        type: 'functions',
        create1:
          'CREATE FUNCTION obj1() returns int LANGUAGE plpgsql AS $$ declare  res integer; begin select count(*) into res from t1; return res; end; $$',
        create2:
          'CREATE FUNCTION obj2() returns int LANGUAGE plpgsql AS $$ declare res integer; begin select count(*) into res from t2; return res; end; $$',
        drop1: 'DROP FUNCTION obj1',
        drop2: 'DROP FUNCTION obj2',
      },
    ],
  },
  {
    label: 'SQL Server',
    connection: {
      engine: 'mssql@dbgate-plugin-mssql',
      password: 'Pwd2020Db',
      user: 'sa',
      server: 'mssql',
      port: 1433,
    },
    local: {
      server: 'localhost',
      port: 15002,
    },
    objects: [
      views,
      {
        type: 'procedures',
        create1: 'CREATE PROCEDURE obj1 AS SELECT id FROM t1',
        create2: 'CREATE PROCEDURE obj2 AS SELECT id FROM t2',
        drop1: 'DROP PROCEDURE obj1',
        drop2: 'DROP PROCEDURE obj2',
      },
    ],
  },
  {
    label: 'SQLite',
    generateDbFile: true,
    connection: {
      engine: 'sqlite@dbgate-plugin-sqlite',
    },
    objects: [views],
  },
  {
    label: 'CockroachDB',
    connection: {
      engine: 'cockroach@dbgate-plugin-postgres',
      user: 'root',
      server: 'cockroachdb',
      port: 26257,
    },
    local: {
      server: 'localhost',
      port: 15003,
    },
    skipOnCI: true,
    objects: [views, matviews],
  },
];

const filterLocal = [
  // filter local testing
  '-MySQL',
  '-MariaDB',
  '-PostgreSQL',
  'SQL Server',
  '-SQLite',
  '-CockroachDB',
];

module.exports = process.env.CITEST
  ? engines.filter(x => !x.skipOnCI)
  : engines.filter(x => filterLocal.find(y => x.label == y));
