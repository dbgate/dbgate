const { Client } = require('pg');

module.exports = async function connect({ server, port, user, password }) {
  const client = new Client({ host: server, port, user, password, database: 'postgres' });
  await client.connect();
  const res = await client.query('SELECT version()');
  const { version } = res.rows[0];
  await client.end();
  return { version };
};
