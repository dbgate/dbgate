const mssql = require('mssql');

process.on('message', async connection => {
  const { server, port, user, password } = connection;
  try {
    const pool = await mssql.connect({ server, port, user, password });
    const resp = await pool.request().query('SELECT @@VERSION AS version');
    const { version } = resp.recordset[0];
    process.send({ version });
  } catch (e) {
    process.send({ error: e.message });
  }
});
