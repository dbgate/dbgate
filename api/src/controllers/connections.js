const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const express = require('express');
const router = express.Router();
const { fork } = require('child_process');
const _ = require('lodash');
const datadir = require('../utility/datadir');
const nedb = require('nedb-promises');

module.exports = {
  datastore: null,
  async _init() {
    const dir = await datadir();
    this.datastore = nedb.create(path.join(dir, 'connections.jsonl'));
  },
  list_meta: 'get',
  async list() {
    return this.datastore.find();
  },
  test_meta: {
    method: 'post',
    raw: true,
  },
  test(req, res) {
    const subprocess = fork(`${__dirname}/../connectProcess.js`);
    subprocess.send(req.body);
    subprocess.on('message', resp => res.json(resp));
  },

  save_meta: 'post',
  async save(connection) {
    const res = await this.datastore.insert(connection);
    return res;
  },
};
