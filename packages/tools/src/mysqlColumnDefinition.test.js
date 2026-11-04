const tools = require('./index');

const previousPackages = global.DBGATE_PACKAGES;
global.DBGATE_PACKAGES = { ...previousPackages, 'dbgate-tools': tools };
const Analyser = require('../../../plugins/dbgate-plugin-mysql/src/backend/Analyser');
const drivers = require('../../../plugins/dbgate-plugin-mysql/src/frontend/drivers');
global.DBGATE_PACKAGES = previousPackages;

const mysql = drivers.find(x => x.engine == 'mysql@dbgate-plugin-mysql');
const maria = drivers.find(x => x.engine == 'mariadb@dbgate-plugin-mysql');

async function analyseColumn(row, driver = mysql) {
  const analyser = new Analyser({ database: 'test' }, driver);
  analyser.feedback = jest.fn();
  analyser.analyserQuery = jest.fn(async name => ({
    rows:
      name == 'tables'
        ? [{ pureName: 't' }]
        : name == 'columns'
          ? [{ pureName: 't', columnName: 'value', isNullable: 'YES', ...row }]
          : [],
  }));
  const db = tools.extendDatabaseInfo(await analyser._runAnalysis());
  return db.tables[0].columns[0];
}

describe.each(['move', 'change'])('MySQL column definition during %s', operation => {
  function dump(column, driver = mysql) {
    const dumper = driver.createDumper();
    if (operation == 'move') dumper.changeColumnPosition(column, null);
    else dumper.changeColumn(column, { ...column, columnName: 'renamed' }, []);
    return dumper.s;
  }

  test.each(['uuid()', '(uuid())', "concat('prefix-', uuid())"])(
    'keeps expression default %s as SQL',
    async defaultValue => {
      const column = await analyseColumn({
        dataType: 'varchar',
        columnType: 'varchar(100)',
        charMaxLength: 100,
        defaultValue,
        extra: 'DEFAULT_GENERATED',
      });
      expect(dump(column)).toContain(`DEFAULT (${defaultValue})`);
    }
  );

  test('still quotes literal defaults that look like expressions', async () => {
    const column = await analyseColumn({
      dataType: 'varchar',
      columnType: 'varchar(100)',
      charMaxLength: 100,
      defaultValue: 'uuid()',
      extra: '',
    });
    expect(dump(column)).toContain("DEFAULT 'uuid()'");
  });

  test('keeps generated CURRENT_TIMESTAMP defaults as SQL', async () => {
    const column = await analyseColumn({
      dataType: 'timestamp',
      columnType: 'timestamp(6)',
      defaultValue: 'CURRENT_TIMESTAMP(6)',
      extra: 'DEFAULT_GENERATED',
    });
    expect(dump(column)).toContain('DEFAULT (CURRENT_TIMESTAMP(6))');
  });

  test('does not add a default for null metadata', async () => {
    const column = await analyseColumn({
      dataType: 'int',
      columnType: 'int',
      defaultValue: null,
      extra: 'DEFAULT_GENERATED',
    });
    expect(dump(column)).not.toContain('DEFAULT');
  });

  test.each(['float', 'double', 'real'])('keeps full %s precision and scale', async dataType => {
    const column = await analyseColumn({
      dataType,
      columnType: `${dataType}(10,2) unsigned zerofill`,
      numericPrecision: 10,
      numericScale: 2,
    });
    expect(column.dataType).toBe(`${dataType}(10,2)`);
    expect(dump(column)).toContain(`${dataType.toUpperCase()}(10,2) UNSIGNED ZEROFILL`);
  });

  test('preserves already formatted MariaDB defaults', async () => {
    const column = await analyseColumn(
      {
        dataType: 'varchar',
        columnType: 'varchar(100)',
        charMaxLength: 100,
        defaultValue: "'uuid()'",
        extra: '',
      },
      maria
    );
    expect(dump(column, maria)).toContain("DEFAULT 'uuid()'");
  });
});
