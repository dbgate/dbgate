const express = require('express');
const router = express.Router();
const { fork } = require('child_process');

router.post('/test', async (req, res) => {
  const subprocess = fork(`${__dirname}/connectProcess.js`);
  subprocess.send(req.body);
  subprocess.on('message', resp => res.json(resp));

  //   const { server, port, user, password } = req.body;
  //   let pool;
  //   try {
  //     pool = await mssql.connect({ server, port, user, password });
  //     const resp = await pool.request().query('SELECT @@VERSION AS version');
  //     const { version } = resp.recordset[0];
  //     res.json({ version });
  //   } catch (e) {
  //     res.json({ error: e.message });
  //   }
  //   if (pool) await pool.close();
});

module.exports = router;
