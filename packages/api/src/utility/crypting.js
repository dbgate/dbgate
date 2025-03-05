const crypto = require('crypto');
const simpleEncryptor = require('simple-encryptor');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const { datadir } = require('./directories');

const defaultEncryptionKey = 'mQAUaXhavRGJDxDTXSCg7Ej0xMmGCrx6OKA07DIMBiDcYYkvkaXjTAzPUEHEHEf9';

let _encryptionKey = null;

function loadEncryptionKey() {
  if (_encryptionKey) {
    return _encryptionKey;
  }
  const encryptor = simpleEncryptor.createEncryptor(defaultEncryptionKey);

  const keyFile = path.join(datadir(), '.key');

  if (!fs.existsSync(keyFile)) {
    const generatedKey = crypto.randomBytes(32);
    const newKey = generatedKey.toString('hex');
    const result = {
      encryptionKey: newKey,
    };
    fs.writeFileSync(keyFile, encryptor.encrypt(result), 'utf-8');
  }

  const encryptedData = fs.readFileSync(keyFile, 'utf-8');
  const data = encryptor.decrypt(encryptedData);
  _encryptionKey = data['encryptionKey'];
  return _encryptionKey;
}

let _encryptor = null;

function getEncryptor() {
  if (_encryptor) {
    return _encryptor;
  }
  _encryptor = simpleEncryptor.createEncryptor(loadEncryptionKey());
  return _encryptor;
}

function encryptPasswordField(connection, field) {
  if (
    connection &&
    connection[field] &&
    !connection[field].startsWith('crypt:') &&
    connection.passwordMode != 'saveRaw'
  ) {
    return {
      ...connection,
      [field]: 'crypt:' + getEncryptor().encrypt(connection[field]),
    };
  }
  return connection;
}

function decryptPasswordField(connection, field) {
  if (connection && connection[field] && connection[field].startsWith('crypt:')) {
    return {
      ...connection,
      [field]: getEncryptor().decrypt(connection[field].substring('crypt:'.length)),
    };
  }
  return connection;
}

function encryptConnection(connection) {
  connection = encryptPasswordField(connection, 'password');
  connection = encryptPasswordField(connection, 'sshPassword');
  connection = encryptPasswordField(connection, 'sshKeyfilePassword');
  return connection;
}

function maskConnection(connection) {
  if (!connection) return connection;
  return _.omit(connection, ['password', 'sshPassword', 'sshKeyfilePassword']);
}

function decryptConnection(connection) {
  connection = decryptPasswordField(connection, 'password');
  connection = decryptPasswordField(connection, 'sshPassword');
  connection = decryptPasswordField(connection, 'sshKeyfilePassword');
  return connection;
}

function pickSafeConnectionInfo(connection) {
  if (process.env.LOG_CONNECTION_SENSITIVE_VALUES) {
    return connection;
  }
  return _.mapValues(connection, (v, k) => {
    if (k == 'engine' || k == 'port' || k == 'authType' || k == 'sshMode' || k == 'passwordMode') return v;
    if (v === null || v === true || v === false) return v;
    if (v) return '***';
    return undefined;
  });
}

module.exports = {
  loadEncryptionKey,
  encryptConnection,
  decryptConnection,
  maskConnection,
  pickSafeConnectionInfo,
};
