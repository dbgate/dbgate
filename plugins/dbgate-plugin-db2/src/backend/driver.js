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
  databaseEngineTypes: ['db2'],

  async connect({ server, port, user, password, database, ssl, isReadOnly, useDatabaseUrl, databaseUrl }) {
    try {
      let connStr;
      if (useDatabaseUrl && databaseUrl) {
        connStr = databaseUrl;
      } else {
        connStr = `DATABASE=${database};HOSTNAME=${server};PORT=${port};PROTOCOL=TCPIP;UID=${user};PWD=${password};`;
      }
      const client = await ibmdb.open(connStr);
      
      if (isReadOnly) {
        await this.query({ client, database }, 'SET CURRENT ISOLATION = UR');
      }
      
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
      if (sql == null || sql.trim() == '') {
        return {
          rows: [],
          columns: [],
          rowCount: 0,
        };
      }
      
      const result = await dbhan.client.query(sql, params);
      
      if (!result || result.length === 0) {
        return {
          rows: [],
          columns: [],
          rowCount: 0,
        };
      }
      
      // Extract column information from the first row
      const columns = Object.keys(result[0]).map(columnName => ({
        columnName,
        dataType: typeof result[0][columnName]
      }));
      
      return {
        rows: result,
        columns: columns,
        rowCount: result.length,
      };
    } catch (err) {
      throw new Error(`Query failed: ${err.message}`);
    }
  },
  async stream(dbhan, sql, options) {
    try {
      // Execute the query
      const result = await dbhan.client.query(sql);
      
      // If there are no results, just mark it as done
      if (!result || result.length === 0) {
        options.done();
        return;
      }
      
      // Extract column information from the first row
      if (result.length > 0) {
        const firstRow = result[0];
        const columns = Object.keys(firstRow).map(columnName => ({
          columnName,
          dataType: typeof firstRow[columnName]
        }));
        
        // Send column info
        options.recordset(columns);
        
        // Send each row
        for (const row of result) {
          options.row(row);
        }
      }
      
      // Mark as done when complete
      options.done();
    } catch (err) {
      // Report errors
      options.info({
        message: err.message,
        time: new Date(),
        severity: 'error',
      });
      options.done();
    }
  },

  async readQuery(dbhan, sql, structure) {
    const stream = require('stream');
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });
    
    try {
      const result = await dbhan.client.query(sql);
      
      if (result && result.length > 0) {
        // Extract columns from first row
        const firstRow = result[0];
        const columns = Object.keys(firstRow).map(columnName => ({
          columnName,
          dataType: typeof firstRow[columnName]
        }));
        
        // Write header
        pass.write({
          __isStreamHeader: true,
          ...(structure || { columns }),
        });
        
        // Write rows
        for (const row of result) {
          pass.write(row);
        }
      }
      
      pass.end();
      return pass;
    } catch (err) {
      pass.write({
        __isStreamInfo: true,
        info: {
          message: err.message,
          time: new Date(),
          severity: 'error',
        },
      });
      pass.end();
      return pass;
    }
  },
  async writeTable(dbhan, name, options) {
    const stream = require('stream');
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },

  async getVersion(dbhan) {
    try {
      const result = await dbhan.client.query('SELECT service_level as version FROM TABLE (sysproc.env_get_inst_info())');
      return result?.[0]?.VERSION;
    } catch (err) {
      return null;
    }
  },

  async listDatabases(dbhan) {
    try {
      const result = await dbhan.client.query('SELECT dbname FROM sysibm.sysdummy1');
      return result.map(row => ({ name: row.DBNAME }));
    } catch (err) {
      return [];
    }
  },

  async beginTransaction(dbhan) {
    await dbhan.client.query('BEGIN');
  },

  async commitTransaction(dbhan) {
    await dbhan.client.query('COMMIT');
  },

  async rollbackTransaction(dbhan) {
    await dbhan.client.query('ROLLBACK');
  },

  getDefaultPort() {
    return this.defaultPort;
  },

  getEngineName() {
    return this.name;
  },

  getEngineVersion() {
    return null;
  },

  getDefaultDatabase() {
    return this.defaultDatabase;
  }
};

module.exports = driver;