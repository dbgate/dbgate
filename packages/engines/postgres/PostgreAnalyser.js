const fp = require("lodash/fp");
const _ = require("lodash");

const DatabaseAnalayser = require("../default/DatabaseAnalyser");

/** @returns {Promise<string>} */
async function loadQuery(pool, name) {
  return await pool._nativeModules.fs.readFile(
    pool._nativeModules.path.join(__dirname, name),
    "utf-8"
  );
}

class MySqlAnalyser extends DatabaseAnalayser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  async createQuery(
    resFileName,
    tables = false,
    views = false,
    procedures = false,
    functions = false,
    triggers = false
  ) {
    let res = await loadQuery(this.pool, resFileName);
    res = res.replace("=[OBJECT_ID_CONDITION]", " is not null");
    return res;
  }
  async runAnalysis() {
    const tables = await this.driver.query(
      this.pool,
      await this.createQuery("table_modifications.psql")
    );
    const columns = await this.driver.query(
      this.pool,
      await this.createQuery("columns.psql")
    );
    //   const pkColumns = await this.driver.query(this.pool, await this.createQuery('primary_keys.sql'));
    //   const fkColumns = await this.driver.query(this.pool, await this.createQuery('foreign_keys.sql'));

    this.result.tables = tables.rows.map(table => ({
      ...table,
      columns: columns.rows
        .filter(
          col =>
            col.pureName == table.pureName && col.schemaName == table.schemaName
        )
        .map(({ isNullable, ...col }) => ({
          ...col,
          notNull: !isNullable
        })),
      foreignKeys: []
      // primaryKey: extractPrimaryKeys(table, pkColumns.rows),
      // foreignKeys: extractForeignKeys(table, fkColumns.rows),
    }));
  }
}

module.exports = MySqlAnalyser;
