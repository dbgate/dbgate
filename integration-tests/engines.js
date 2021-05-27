const views = {
  type: 'views',
  create1: 'CREATE VIEW obj1 AS SELECT id FROM t1',
  create2: 'CREATE VIEW obj2 AS SELECT id FROM t2',
  drop1: 'DROP VIEW obj1',
  drop2: 'DROP VIEW obj2',
};

const engines = [
  // {
  //   label: 'MySQL',
  //   connection: {
  //     engine: 'mysql@dbgate-plugin-mysql',
  //     server: 'localhost',
  //     password: 'Pwd2020Db',
  //     user: 'root',
  //     port: 15001,
  //   },
  //   objects: [views],
  // },
  {
    label: 'PostgreSQL',
    connection: {
      engine: 'postgres@dbgate-plugin-postgres',
      server: 'postgres',
      password: 'Pwd2020Db',
      user: 'postgres',
      port: 5432,
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
  // {
  //   label: 'SQL Server',
  //   connection: {
  //     engine: 'mssql@dbgate-plugin-mssql',
  //     server: 'localhost',
  //     password: 'Pwd2020Db',
  //     user: 'sa',
  //     port: 15002,
  //   },
  //   objects: [
  //     views,
  //     {
  //       type: 'procedures',
  //       create1: 'CREATE PROCEDURE obj1 AS SELECT id FROM t1',
  //       create2: 'CREATE PROCEDURE obj2 AS SELECT id FROM t2',
  //       drop1: 'DROP PROCEDURE obj1',
  //       drop2: 'DROP PROCEDURE obj2',
  //     },
  //   ],
  // },
  // {
  //   label: 'SQLite',
  //   generateDbFile: true,
  //   connection: {
  //     engine: 'sqlite@dbgate-plugin-sqlite',
  //   },
  //   objects: [views],
  // },
  // {
  //   label: 'CockroachDB',
  //   connection: {
  //     engine: 'cockroach@dbgate-plugin-postgres',
  //     server: 'localhost',
  //     user: 'root',
  //     port: 15003,
  //   },
  //   objects: [views],
  // },
];

module.exports = engines;
