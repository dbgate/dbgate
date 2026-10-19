const engines = require('../engines');
const { testWrapper } = require('../tools');
const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const { runQueryOnDriver, runCommandOnDriver } = require('dbgate-tools');

// Regression tests for object names containing quote characters.
//
// quoteIdentifier did not escape the closing delimiter (" ` ]), so a table or column named e.g.
//   x"; DROP TABLE users; --
// broke out of the quoted identifier in every query DbGate generated for it (grid selects,
// changesets, DDL, exports), and a name containing ' broke out of the string literals of the
// structure analysis queries (e.g. pragma table_info('...') in SQLite).

// all closing delimiters and a string literal quote; Oracle does not allow " in quoted identifiers
const nameChars = engine => (engine.label == 'Oracle' ? "`]'" : '"`]\'');

// Cassandra table names can contain only letters, digits and underscores, even when quoted
const tableName = engine => (engine.label == 'Cassandra' ? 'tx' : `t${nameChars(engine)}x`);
const columnName = engine => `c${nameChars(engine)}x`;

describe('Identifier quoting', () => {
  test.each(engines.map(engine => [engine.label, engine]))('Closing delimiter is escaped - %s', (label, engine) => {
    const { quoteIdentifier } = requireEngineDriver(engine.connection).dialect;
    const name = `c${nameChars(engine)}x`;
    const quoted = quoteIdentifier(name);
    const closing = quoted[quoted.length - 1];
    // inside the quotes, the closing delimiter appears only escaped (doubled, or after a backslash)
    const inner = quoted.substring(1, quoted.length - 1);
    expect(
      inner
        .replaceAll('\\\\', '')
        .replaceAll(closing + closing, '')
        .replaceAll('\\' + closing, '')
    ).not.toContain(closing);
  });

  test.each(engines.filter(x => !x.skipDataModifications).map(engine => [engine.label, engine]))(
    'Table with quote characters in names - create, insert, select - %s',
    testWrapper(async (conn, driver, engine) => {
      const table = { pureName: tableName(engine) };
      await runCommandOnDriver(conn, driver, dmp =>
        dmp.put(
          `CREATE TABLE %f (%i int ${engine.skipNullability ? '' : 'not null'} primary key, %i ${
            engine.useTextTypeForStrings ? 'text' : 'varchar(50)'
          })`,
          table,
          'id',
          columnName(engine)
        )
      );
      await runCommandOnDriver(conn, driver, dmp =>
        dmp.put('INSERT INTO %f (%i, %i) VALUES (1, %v)', table, 'id', columnName(engine), "it's")
      );

      const res = await runQueryOnDriver(conn, driver, dmp => dmp.put('SELECT %i FROM %f', columnName(engine), table));
      expect(res.rows.length).toEqual(1);
      expect(Object.values(res.rows[0])).toEqual(["it's"]);
    })
  );

  test.each(engines.map(engine => [engine.label, engine]))(
    'Table with quote characters in names - structure analysis - %s',
    testWrapper(async (conn, driver, engine) => {
      await runCommandOnDriver(conn, driver, dmp =>
        dmp.put(
          `CREATE TABLE %f (%i int ${engine.skipNullability ? '' : 'not null'} primary key, %i ${
            engine.useTextTypeForStrings ? 'text' : 'varchar(50)'
          })`,
          { pureName: tableName(engine) },
          'id',
          columnName(engine)
        )
      );

      const structure = await driver.analyseFull(conn);
      const table = structure.tables.find(x => x.pureName == tableName(engine));
      expect(table).toBeTruthy();
      const actualColumns = table.columns.map(x => x.columnName);
      const expectedColumns = ['id', columnName(engine)];
      if (engine.forceSortStructureColumns) {
        actualColumns.sort();
        expectedColumns.sort();
      }
      expect(actualColumns).toEqual(expectedColumns);
    })
  );
});
