const views = {
  type: 'views',
  create1: 'CREATE VIEW obj1 AS SELECT id FROM t1',
  create2: 'CREATE VIEW obj2 AS SELECT id FROM t2',
  drop1: 'DROP VIEW obj1',
  drop2: 'DROP VIEW obj2',
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
    skipOnGithub: true,
    objects: [views],
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
      {
        type: 'procedures',
        create1: 'CREATE PROCEDURE obj1() LANGUAGE SQL AS $$  select * from t1 $$',
        create2: 'CREATE PROCEDURE obj2() LANGUAGE SQL AS $$  select * from t2 $$',
        drop1: 'DROP PROCEDURE obj1',
        drop2: 'DROP PROCEDURE obj2',
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
    skipOnGithub: true,
    objects: [views],
  },
];

module.exports = engines;
