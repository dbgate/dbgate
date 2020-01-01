const mssql = require('mssql');

module.exports = async function connect({ server, port, user, password }) {
  const pool = await mssql.connect({ server, port, user, password });
  const resp = await pool.request().query('SELECT @@VERSION AS version');
  const { version } = resp.recordset[0];
  return { version };
};
