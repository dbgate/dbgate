const _ = require('lodash');
const fp = require('lodash/fp');
const uuidv1 = require('uuid/v1');
const connections = require('./connections');
const socket = require('../utility/socket');
const { fork } = require('child_process');
const DatabaseAnalyser = require('@dbgate/engines/default/DatabaseAnalyser');

function pickObjectNames(array) {
  return _.sortBy(array, (x) => `${x.schemaName}.${x.pureName}`).map(fp.pick(['pureName', 'schemaName']));
}

module.exports = {
  /** @type {import('@dbgate/types').OpenedDatabaseConnection[]} */
  opened: [],
  requests: {},

  handle_structure(conid, database, { structure }) {
    const existing = this.opened.find((x) => x.conid == conid && x.database == database);
    if (!existing) return;
    existing.structure = structure;
    socket.emit(`database-structure-changed-${conid}-${database}`);
  },
  handle_error(conid, database, props) {
    const { error } = props;
    console.log(`Error in database connection ${conid}, database ${database}: ${error}`);
  },
  handle_response(conid, database, { msgid, ...response }) {
    const [resolve, reject] = this.requests[msgid];
    resolve(response);
    delete this.requests[msgid];
  },

  async ensureOpened(conid, database) {
    const existing = this.opened.find((x) => x.conid == conid && x.database == database);
    if (existing) return existing;
    const connection = await connections.get({ conid });
    const subprocess = fork(process.argv[1], ['databaseConnectionProcess']);
    const newOpened = {
      conid,
      database,
      subprocess,
      structure: DatabaseAnalyser.createEmptyStructure(),
      connection,
    };
    this.opened.push(newOpened);
    // @ts-ignore
    subprocess.on('message', ({ msgtype, ...message }) => {
      this[`handle_${msgtype}`](conid, database, message);
    });
    subprocess.send({ msgtype: 'connect', ...connection, database });
    return newOpened;
  },

  /** @param {import('@dbgate/types').OpenedDatabaseConnection} conn */
  sendRequest(conn, message) {
    const msgid = uuidv1();
    const promise = new Promise((resolve, reject) => {
      this.requests[msgid] = [resolve, reject];
      conn.subprocess.send({ msgid, ...message });
    });
    return promise;
  },

  listObjects_meta: 'get',
  async listObjects({ conid, database }) {
    const opened = await this.ensureOpened(conid, database);
    const types = ['tables', 'views', 'procedures', 'functions', 'triggers'];
    return types.reduce(
      (res, type) => ({
        ...res,
        [type]: pickObjectNames(opened.structure[type]),
      }),
      {}
    );
  },

  queryData_meta: 'post',
  async queryData({ conid, database, sql }) {
    console.log(`Processing query, conid=${conid}, database=${database}, sql=${sql}`);
    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype: 'queryData', sql });
    return res;
  },

  // runCommand_meta: 'post',
  // async runCommand({ conid, database, sql }) {
  //   console.log(`Running SQL command , conid=${conid}, database=${database}, sql=${sql}`);
  //   const opened = await this.ensureOpened(conid, database);
  //   const res = await this.sendRequest(opened, { msgtype: 'queryData', sql });
  //   return res;
  // },
};
