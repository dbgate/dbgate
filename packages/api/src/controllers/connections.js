
const path = require('path');
const { fork } = require('child_process');
const _ = require('lodash');
const nedb = require('nedb-promises');

const datadir = require('../utility/datadir');
const socket = require('../utility/socket');

module.exports = {
  datastore: null,
  opened: [],

  async _init() {
    const dir = datadir();
    // @ts-ignore
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
    const subprocess = fork(process.argv[1], ['connectProcess']);
    subprocess.on('message', resp => res.json(resp));
    subprocess.send(req.body);
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
    const res = await this.datastore.remove(_.pick(connection, '_id'));
    socket.emit('connection-list-changed');
    return res;
  },

  get_meta: 'get',
  async get({ conid }) {
    const res = await this.datastore.find({ _id: conid });
    return res[0];
  },
};
