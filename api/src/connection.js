const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const express = require('express');
const router = express.Router();
const { fork } = require('child_process');
const _ = require('lodash');

function datadir() {
  return path.join(os.homedir(), 'dbgate-data');
}

router.post('/test', async (req, res) => {
  const subprocess = fork(`${__dirname}/connectProcess.js`);
  subprocess.send(req.body);
  subprocess.on('message', resp => res.json(resp));
});

router.post('/save', async (req, res) => {
  await fs.mkdir(datadir());
  const fileName = `${new Date().getTime()}.con`;
  await fs.writeFile(path.join(datadir(), fileName), JSON.stringify(req.body));
  res.json({ fileName });
});

router.get('/list', async (req, res) => {
  const files = await fs.readdir(datadir());

  res
    .json(
      await Promise.all(files.filter(x => x.endsWith('.con')).map(x => fs.readFile(path.join(datadir(), x), 'utf-8')))
    )
    .map(x => _.omit(JSON.parse(x), 'password'));
});

module.exports = router;
