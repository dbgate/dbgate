// @ts-check
const views = {
  type: 'views',
  create1: 'CREATE VIEW ~obj1 AS SELECT ~id FROM ~t1',
  create2: 'CREATE VIEW ~obj2 AS SELECT ~id FROM ~t2',
  drop1: 'DROP VIEW ~obj1',
  drop2: 'DROP VIEW ~obj2',
};
const matviews = {
  type: 'matviews',
  create1: 'CREATE MATERIALIZED VIEW obj1 AS SELECT id FROM t1',
  create2: 'CREATE MATERIALIZED VIEW obj2 AS SELECT id FROM t2',
  drop1: 'DROP MATERIALIZED VIEW obj1',
  drop2: 'DROP MATERIALIZED VIEW obj2',
};

/** @type {import('dbgate-types').TestEngineInfo} */
const mysqlEngine = {
  label: 'MySQL',
  connection: {
    engine: 'mysql@dbgate-plugin-mysql',
    password: 'Pwd2020Db',
    user: 'root',
    server: 'localhost',
    port: 15001,
  },
  objects: [
    views,
    {
      type: 'schedulerEvents',
      create1: 'CREATE EVENT obj1 ON SCHEDULE EVERY 1 HOUR DO BEGIN END',
      create2: 'CREATE EVENT obj2 ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 DAY DO BEGIN END',
      drop1: 'DROP EVENT obj1',
      drop2: 'DROP EVENT obj2',
    },
    {
      type: 'procedures',
      create1: 'CREATE PROCEDURE obj1() BEGIN SELECT * FROM t1; END',
      create2: 'CREATE PROCEDURE obj2() BEGIN SELECT * FROM t2; END',
      drop1: 'DROP PROCEDURE obj1',
      drop2: 'DROP PROCEDURE obj2',
    },
  ],
  supportRenameSqlObject: false,
  dbSnapshotBySeconds: true,
  dumpFile: 'data/chinook-mysql.sql',
  dumpChecks: [
    {
      sql: 'select count(*) as res from genre',
      res: '25',
    },
  ],
  parametersOtherSql: ['CREATE PROCEDURE obj2(a int, b int) BEGIN SELECT * FROM t1; END'],
  parameters: [
    {
      testName: 'simple',
      create: 'CREATE PROCEDURE obj1(a int) BEGIN SELECT * FROM t1; END',
      drop: 'DROP PROCEDURE obj1',
      objectTypeField: 'procedures',
      list: [
        {
          parameterName: 'a',
          parameterMode: 'IN',
          dataType: 'int',
        },
      ],
    },
    {
      testName: 'paramTypes',
      create: 'CREATE PROCEDURE obj1(a int, b varchar(50), c numeric(10,2)) BEGIN SELECT * FROM t1; END',
      drop: 'DROP PROCEDURE obj1',
      objectTypeField: 'procedures',
      list: [
        {
          parameterName: 'a',
          parameterMode: 'IN',
          dataType: 'int',
        },
        {
          parameterName: 'b',
          parameterMode: 'IN',
          dataType: 'varchar(50)',
        },
        {
          parameterName: 'c',
          parameterMode: 'IN',
          dataType: 'decimal(10,2)',
        },
      ],
    },
    {
      testName: 'paramModes',
      create: 'CREATE PROCEDURE obj1(IN a int, OUT b int, INOUT c int) BEGIN SELECT * FROM t1; END',
      drop: 'DROP PROCEDURE obj1',
      objectTypeField: 'procedures',
      list: [
        {
          parameterName: 'a',
          parameterMode: 'IN',
          dataType: 'int',
        },
        {
          parameterName: 'b',
          parameterMode: 'OUT',
          dataType: 'int',
        },
        {
          parameterName: 'c',
          parameterMode: 'INOUT',
          dataType: 'int',
        },
      ],
    },
  ],
  triggers: [
    {
      testName: 'triggers insert after',
      create: 'CREATE TRIGGER obj1 AFTER INSERT ON t1 FOR EACH ROW BEGIN END',
      drop: 'DROP TRIGGER obj1;',
      objectTypeField: 'triggers',
      expected: {
        pureName: 'obj1',
        eventType: 'INSERT',
        triggerTiming: 'AFTER',
      },
    },
    {
      testName: 'triggers insert before',
      create: 'CREATE TRIGGER obj1 BEFORE INSERT ON t1 FOR EACH ROW BEGIN END',
      drop: 'DROP TRIGGER obj1;',
      objectTypeField: 'triggers',
      expected: {
        pureName: 'obj1',
        eventType: 'INSERT',
        triggerTiming: 'BEFORE',
      },
    },
  ],
  schedulerEvents: [
    {
      create: 'CREATE EVENT obj1 ON SCHEDULE EVERY 1 HOUR DO BEGIN END',
      drop: 'DROP EVENT obj1',
      objectTypeField: 'schedulerEvents',
      expected: {
        pureName: 'obj1',
        status: 'ENABLED',
        eventType: 'RECURRING',
        intervalValue: '1',
        intervalField: 'HOUR',
      },
    },
    {
      create: 'CREATE EVENT obj1 ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 DAY DO BEGIN END',
      drop: 'DROP EVENT obj1',
      objectTypeField: 'schedulerEvents',
      expected: {
        pureName: 'obj1',
        status: 'ENABLED',
        eventType: 'ONE TIME',
      },
    },
  ],
};

/** @type {import('dbgate-types').TestEngineInfo} */
const mariaDbEngine = {
  label: 'MariaDB',
  connection: {
    engine: 'mariadb@dbgate-plugin-mysql',
    password: 'Pwd2020Db',
    user: 'root',
    server: 'localhost',
    port: 15004,
  },
  objects: [views],
  dbSnapshotBySeconds: true,
  dumpFile: 'data/chinook-mysql.sql',
  dumpChecks: [
    {
      sql: 'select count(*) as res from genre',
      res: '25',
    },
  ],
};

/** @type {import('dbgate-types').TestEngineInfo} */
const postgreSqlEngine = {
  label: 'PostgreSQL',
  connection: {
    engine: 'postgres@dbgate-plugin-postgres',
    password: 'Pwd2020Db',
    user: 'postgres',
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
  supportSchemas: true,
  supportRenameSqlObject: true,
  defaultSchemaName: 'public',
  dumpFile: 'data/chinook-postgre.sql',
  dumpChecks: [
    {
      sql: 'select count(*) as res from "public"."Genre"',
      res: '25',
    },
  ],

  parametersOtherSql: ['CREATE PROCEDURE obj2(a integer, b integer) LANGUAGE SQL AS $$ select * from t1 $$'],
  parameters: [
    {
      testName: 'simple',
      create: 'CREATE PROCEDURE obj1(a integer) LANGUAGE SQL AS $$ select * from t1 $$',
      drop: 'DROP PROCEDURE obj1',
      objectTypeField: 'procedures',
      list: [
        {
          parameterName: 'a',
          parameterMode: 'IN',
          dataType: 'integer',
        },
      ],
    },
    {
      testName: 'dataTypes',
      create: 'CREATE PROCEDURE obj1(a integer, b varchar(20), c numeric(18,2)) LANGUAGE SQL AS $$ select * from t1 $$',
      drop: 'DROP PROCEDURE obj1',
      objectTypeField: 'procedures',
      list: [
        {
          parameterName: 'a',
          parameterMode: 'IN',
          dataType: 'integer',
        },
        {
          parameterName: 'b',
          parameterMode: 'IN',
          dataType: 'varchar',
        },
        {
          parameterName: 'c',
          parameterMode: 'IN',
          dataType: 'numeric',
        },
      ],
    },
    {
      testName: 'paramModes',
      create: 'CREATE PROCEDURE obj1(IN a integer, INOUT b integer) LANGUAGE SQL AS $$ select * from t1 $$',
      drop: 'DROP PROCEDURE obj1',
      objectTypeField: 'procedures',
      list: [
        {
          parameterName: 'a',
          parameterMode: 'IN',
          dataType: 'integer',
        },
        {
          parameterName: 'b',
          parameterMode: 'INOUT',
          dataType: 'integer',
        },
      ],
    },
    {
      testName: 'paramModesFunction',
      objectTypeField: 'functions',
      create: `
create or replace function obj1(
  out min_len int,
  out max_len int)
language plpgsql
as $$
begin
select min(id),
       max(id)
into min_len, max_len
from t1;
end;$$`,
      drop: 'DROP FUNCTION obj1',
      list: [
        {
          parameterName: 'min_len',
          parameterMode: 'OUT',
          dataType: 'integer',
        },
        {
          parameterName: 'max_len',
          parameterMode: 'OUT',
          dataType: 'integer',
        },
      ],
    },
  ],
  triggers: [
    {
      testName: 'triggers after each row',
      create: `CREATE TRIGGER obj1
AFTER INSERT ON t1
FOR EACH ROW
EXECUTE FUNCTION test_function();
`,
      drop: 'DROP TRIGGER obj1 ON t1;',
      triggerOtherCreateSql: `CREATE OR REPLACE FUNCTION test_function()
RETURNS TRIGGER AS $$
BEGIN
END;
$$ LANGUAGE plpgsql;`,
      triggerOtherDropSql: 'DROP FUNCTION test_function',
      objectTypeField: 'triggers',
      expected: {
        pureName: 'obj1',
        eventType: 'INSERT',
        triggerTiming: 'AFTER',
      },
    },
    {
      testName: 'triggers before each row',
      create: `CREATE TRIGGER obj1
BEFORE INSERT ON t1
FOR EACH ROW
EXECUTE FUNCTION test_function();
`,
      drop: 'DROP TRIGGER obj1 ON t1;',
      triggerOtherCreateSql: `CREATE OR REPLACE FUNCTION test_function()
RETURNS TRIGGER AS $$
BEGIN
END;
$$ LANGUAGE plpgsql;`,
      triggerOtherDropSql: 'DROP FUNCTION test_function',
      objectTypeField: 'triggers',
      expected: {
        pureName: 'obj1',
        eventType: 'INSERT',
        triggerTiming: 'BEFORE',
      },
    },
  ],
};

/** @type {import('dbgate-types').TestEngineInfo} */
const sqlServerEngine = {
  label: 'SQL Server',
  connection: {
    engine: 'mssql@dbgate-plugin-mssql',
    password: 'Pwd2020Db',
    user: 'sa',
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
    {
      type: 'triggers',
      create1: 'CREATE TRIGGER obj1 ON t1 AFTER INSERT AS BEGIN SELECT * FROM t1 END',
      create2: 'CREATE TRIGGER obj2 ON t2 AFTER INSERT AS BEGIN SELECT * FROM t2 END',
      drop1: 'DROP TRIGGER obj1',
      drop2: 'DROP TRIGGER obj2',
    },
  ],
  parametersOtherSql: ['CREATE PROCEDURE obj2 (@p1 int, @p2 int) AS SELECT id from t1'],
  parameters: [
    {
      testName: 'simple',
      create: 'CREATE PROCEDURE obj1 (@param1 int) AS SELECT id from t1',
      drop: 'DROP PROCEDURE obj1',
      objectTypeField: 'procedures',
      list: [
        {
          parameterName: '@param1',
          parameterMode: 'IN',
          dataType: 'int',
        },
      ],
    },
    {
      testName: 'dataTypes',
      create: 'CREATE PROCEDURE obj1 (@p1 bit, @p2 nvarchar(20), @p3 decimal(18,2), @p4 float) AS SELECT id from t1',
      drop: 'DROP PROCEDURE obj1',
      objectTypeField: 'procedures',
      list: [
        {
          parameterName: '@p1',
          parameterMode: 'IN',
          dataType: 'bit',
        },
        {
          parameterName: '@p2',
          parameterMode: 'IN',
          dataType: 'nvarchar(20)',
        },
        {
          parameterName: '@p3',
          parameterMode: 'IN',
          dataType: 'decimal(18,2)',
        },
        {
          parameterName: '@p4',
          parameterMode: 'IN',
          dataType: 'float',
        },
      ],
    },
    {
      testName: 'outputParam',
      create: 'CREATE PROCEDURE obj1 (@p1 int OUTPUT) AS SELECT id from t1',
      drop: 'DROP PROCEDURE obj1',
      objectTypeField: 'procedures',
      list: [
        {
          parameterName: '@p1',
          parameterMode: 'OUT',
          dataType: 'int',
        },
      ],
    },
  ],
  supportSchemas: true,
  supportRenameSqlObject: true,
  defaultSchemaName: 'dbo',
  // skipSeparateSchemas: true,
  triggers: [
    {
      testName: 'triggers before each row',
      create: `CREATE TRIGGER obj1 ON t1 AFTER INSERT AS BEGIN SELECT * FROM t1 END`,
      drop: 'DROP TRIGGER obj1',
      objectTypeField: 'triggers',
      expected: {
        pureName: 'obj1',
        eventType: 'INSERT',
        triggerTiming: 'AFTER',
      },
    },
    {
      testName: 'triggers before each row',
      create: `CREATE TRIGGER obj1 ON t1 AFTER UPDATE AS BEGIN SELECT * FROM t1 END`,
      drop: 'DROP TRIGGER obj1',
      objectTypeField: 'triggers',
      expected: {
        pureName: 'obj1',
        eventType: 'UPDATE',
        triggerTiming: 'AFTER',
      },
    },
  ],
};

/** @type {import('dbgate-types').TestEngineInfo} */
const sqliteEngine = {
  label: 'SQLite',
  generateDbFile: true,
  connection: {
    engine: 'sqlite@dbgate-plugin-sqlite',
  },
  objects: [views],
  skipOnCI: false,
  skipChangeColumn: true,
  triggers: [
    {
      testName: 'triggers after each row insert',
      create: `CREATE TRIGGER obj1 AFTER INSERT ON t1 FOR EACH ROW BEGIN SELECT * FROM t1; END;`,
      drop: `DROP TRIGGER obj1;`,
      objectTypeField: 'triggers',
      expected: {
        pureName: 'obj1',
        eventType: 'INSERT',
        triggerTiming: 'AFTER',
      },
    },
    {
      testName: 'triggers before each row update',
      create: `CREATE TRIGGER obj1 BEFORE UPDATE ON t1 FOR EACH ROW BEGIN SELECT * FROM t1; END;`,
      drop: `DROP TRIGGER obj1;`,
      objectTypeField: 'triggers',
      expected: {
        pureName: 'obj1',
        eventType: 'UPDATE',
        triggerTiming: 'BEFORE',
      },
    },
  ],
};

const libsqlFileEngine = {
  ...sqliteEngine,
  label: 'LibSQL FILE',
  connection: {
    engine: 'libsql@dbgate-plugin-sqlite',
  },
};

const libsqlWsEngine = {
  ...sqliteEngine,
  label: 'LibSQL WS',
  connection: {
    engine: 'libsql@dbgate-plugin-sqlite',
    databaseUrl: 'ws://localhost:8080',
  },
};

/** @type {import('dbgate-types').TestEngineInfo} */
const cockroachDbEngine = {
  label: 'CockroachDB',
  connection: {
    engine: 'cockroach@dbgate-plugin-postgres',
    user: 'root',
    server: 'localhost',
    port: 15003,
  },
  objects: [views, matviews],
};

/** @type {import('dbgate-types').TestEngineInfo} */
const clickhouseEngine = {
  label: 'ClickHouse',
  connection: {
    engine: 'clickhouse@dbgate-plugin-clickhouse',
    databaseUrl: 'http://localhost:15005',
    password: 'Pwd2020Db',
  },
  objects: [views],
  skipDataModifications: true,
  skipReferences: true,
  skipIndexes: true,
  skipNullability: true,
  skipUnique: true,
  skipAutoIncrement: true,
  skipPkColumnTesting: true,
  skipDataDuplicator: true,
  skipStringLength: true,
  alterTableAddColumnSyntax: true,
  dbSnapshotBySeconds: true,
  skipChangeColumn: true,
  skipImportModel: true,
};

/** @type {import('dbgate-types').TestEngineInfo} */
const oracleEngine = {
  label: 'Oracle',
  connection: {
    engine: 'oracle@dbgate-plugin-oracle',
    password: 'Pwd2020Db',
    user: 'system',
    server: 'localhost',
    port: 15006,
    serviceName: 'xe',
  },
  skipOnCI: false,
  dbSnapshotBySeconds: true,
  setNullDefaultInsteadOfDrop: true,
  skipIncrementalAnalysis: true,
  objects: [
    views,
    {
      type: 'procedures',
      create1: 'CREATE PROCEDURE ~obj1 AS BEGIN SELECT ~id FROM ~t1 END',
      create2: 'CREATE PROCEDURE ~obj2 AS BEGIN SELECT ~id FROM ~t2 END',
      drop1: 'DROP PROCEDURE ~obj1',
      drop2: 'DROP PROCEDURE ~obj2',
    },
    {
      type: 'functions',
      create1:
        'CREATE FUNCTION ~obj1 RETURN NUMBER IS v_count NUMBER; \n BEGIN SELECT COUNT(*) INTO v_count FROM ~t1;\n RETURN v_count;\n END ~obj1',
      create2:
        'CREATE FUNCTION ~obj2 RETURN NUMBER IS v_count NUMBER; \n BEGIN SELECT COUNT(*) INTO v_count FROM ~t2;\n RETURN v_count;\n END ~obj2',
      drop1: 'DROP FUNCTION ~obj1',
      drop2: 'DROP FUNCTION ~obj2',
    },
  ],
  triggers: [
    {
      testName: 'triggers after each row',
      create: 'CREATE OR REPLACE TRIGGER obj1 AFTER INSERT ON "t1" FOR EACH ROW BEGIN END obj1;',
      drop: 'DROP TRIGGER obj1;',
      objectTypeField: 'triggers',
      expected: {
        pureName: 'OBJ1',
        eventType: 'INSERT',
        triggerTiming: 'AFTER EACH ROW',
      },
    },
    {
      testName: 'triggers before each row',
      create: 'CREATE OR REPLACE TRIGGER obj1 BEFORE INSERT ON "t1" FOR EACH ROW BEGIN END obj1;',
      drop: 'DROP TRIGGER obj1;',
      objectTypeField: 'triggers',
      expected: {
        pureName: 'OBJ1',
        eventType: 'INSERT',
        triggerTiming: 'BEFORE EACH ROW',
      },
    },
  ],
};

/** @type {import('dbgate-types').TestEngineInfo} */
const cassandraEngine = {
  label: 'Cassandra',
  connection: {
    server: 'localhost:15942',
    engine: 'cassandra@dbgate-plugin-cassandra',
  },
  removeNotNull: true,

  alterTableAddColumnSyntax: false,
  skipOnCI: false,
  skipReferences: true,
  // dbSnapshotBySeconds: true,
  // setNullDefaultInsteadOfDrop: true,
  skipIncrementalAnalysis: true,
  skipNonPkRename: true,
  skipPkDrop: true,
  skipDefaultValue: true,
  skipNullability: true,
  skipUnique: true,
  skipIndexes: true,
  skipOrderBy: true,
  skipAutoIncrement: true,
  skipDataModifications: true,
  skipDataDuplicator: true,
  skipDeploy: true,
  skipImportModel: true,

  forceSortResults: true,
  forceSortStructureColumns: true,

  useTextTypeForStrings: true,
  objects: [],
};

const enginesOnCi = [
  // all engines, which would be run on GitHub actions
  mysqlEngine,
  // mariaDbEngine,
  postgreSqlEngine,
  sqlServerEngine,
  sqliteEngine,
  libsqlFileEngine,
  libsqlWsEngine,
  // cockroachDbEngine,
  clickhouseEngine,
  oracleEngine,
  cassandraEngine,
];

const enginesOnLocal = [
  // all engines, which would be run on local test
  // cassandraEngine,
  // mysqlEngine,
  // mariaDbEngine,
  // postgreSqlEngine,
  // sqlServerEngine,
  // sqliteEngine,
  // cockroachDbEngine,
  // clickhouseEngine,
  // libsqlFileEngine,
  libsqlWsEngine,
  // oracleEngine,
];

/** @type {import('dbgate-types').TestEngineInfo[] & Record<string, import('dbgate-types').TestEngineInfo>} */
module.exports = process.env.CITEST ? enginesOnCi : enginesOnLocal;

module.exports.mysqlEngine = mysqlEngine;
module.exports.mariaDbEngine = mariaDbEngine;
module.exports.postgreSqlEngine = postgreSqlEngine;
module.exports.sqlServerEngine = sqlServerEngine;
module.exports.sqliteEngine = sqliteEngine;
module.exports.cockroachDbEngine = cockroachDbEngine;
module.exports.clickhouseEngine = clickhouseEngine;
module.exports.oracleEngine = oracleEngine;
module.exports.cassandraEngine = cassandraEngine;
