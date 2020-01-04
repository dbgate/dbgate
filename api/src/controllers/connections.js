const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const express = require('express');
const router = express.Router();
const { fork } = require('child_process');
const _ = require('lodash');
const nedb = require('nedb-promises');

const datadir = require('../utility/datadir');
const socket = require('../utility/socket');

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
    let res;
    if (connection._id) {
      res = await this.datastore.update(_.pick(connection, '_id'), connection);
    } else {
      res = await this.datastore.insert(connection);
    }
    socket.emit('connection-list-changed');
    return res;
  },

  delete_meta: 'post',
  async delete(connection) {
    let res = await this.datastore.remove(_.pick(connection, '_id'));
    socket.emit('connection-list-changed');
    return res;
  },
};
