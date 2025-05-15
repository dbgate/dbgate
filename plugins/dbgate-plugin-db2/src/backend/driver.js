const ibmdb = require('ibm_db');
const { DatabaseAnalyser, getLogger, createBulkInsertStreamBase, extractErrorLogData } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(connection, driver) {
    super(connection, driver);
  }

  async getTables() {
    const res = await this.driver.query(this.connection, `
      SELECT 
        TABSCHEMA as schemaName,
        TABNAME as tableName,
        REMARKS as description
      FROM SYSCAT.TABLES 
      WHERE TYPE = 'T'
      ORDER BY TABSCHEMA, TABNAME
    `);
    return res.rows;
  }

  async getColumns(table) {
    const res = await this.driver.query(this.connection, `
      SELECT 
        COLNAME as columnName,
        TYPENAME as dataType,
        LENGTH as length,
        SCALE as scale,
        NULLS as isNullable,
        REMARKS as description
      FROM SYSCAT.COLUMNS 
      WHERE TABSCHEMA = ? AND TABNAME = ?
      ORDER BY COLNO
    `, [table.schemaName, table.tableName]);
    return res.rows;
  }
}

const driver = {
  engine: 'db2@dbgate-plugin-db2',
  title: 'IBM DB2',
  defaultPort: 50000,
  defaultDatabase: 'SAMPLE',
  dialect: 'db2',
  analyserClass: Analyser,
  id: 'db2',
  name: 'DB2',
  displayName: 'IBM DB2',
  description: 'IBM DB2 Database',
  category: 'database',
  isBuiltin: true,

  async connect({ server, port, user, password, database, ssl, isReadOnly }) {
    try {
      const connStr = `DATABASE=${database};HOSTNAME=${server};PORT=${port};PROTOCOL=TCPIP;UID=${user};PWD=${password};`;
      const client = await ibmdb.open(connStr);
      return { client, database };
    } catch (err) {
      throw new Error(`Failed to connect to DB2: ${err.message}`);
    }
  },

  async close(dbhan) {
    if (dbhan?.client) {
      await dbhan.client.close();
    }
  },

  async query(dbhan, sql, params = []) {
    try {
      const result = await dbhan.client.query(sql, params);
      return {
        rows: result,
        rowCount: result.length,
      };
    } catch (err) {
      throw new Error(`Query failed: ${err.message}`);
    }
  },

  async stream(dbhan, sql, params = []) {
    try {
      return dbhan.client.queryStream(sql, params);
    } catch (err) {
      throw new Error(`Stream query failed: ${err.message}`);
    }
  },

  async readQuery(dbhan, sql, structure) {
    const result = await this.query(dbhan, sql);
    return result.rows;
  },

  async createBulkInsertStream(dbhan, name, options) {
    return createBulkInsertStreamBase(this, dbhan, name, options);
  },

  async getVersion(dbhan) {
    try {
      const { rows } = await this.query(dbhan, 'SELECT service_level as version FROM TABLE (sysproc.env_get_inst_info())');
      return rows?.[0]?.version;
    } catch (err) {
      return null;
    }
  },

  async beginTransaction(dbhan) {
    await dbhan.client.beginTransaction();
  },

  async commitTransaction(dbhan) {
    await dbhan.client.commitTransaction();
  },

  async rollbackTransaction(dbhan) {
    await dbhan.client.rollbackTransaction();
  },

  getDefaultPort() {
    return 50000;
  },

  getEngineName() {
    return 'DB2';
  },

  getEngineVersion() {
    return '11.5';
  },

  getDefaultDatabase() {
    return 'SAMPLE';
  }
};

module.exports = driver;