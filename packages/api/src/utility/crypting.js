const crypto = require('crypto');
const simpleEncryptor = require('simple-encryptor');
const fs = require('fs');
const path = require('path');

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

function encryptConnection(connection) {
  if (
    connection &&
    connection.password &&
    !connection.password.startsWith('crypt:') &&
    connection.passwordMode != 'saveRaw'
  ) {
    return {
      ...connection,
      password: 'crypt:' + getEncryptor().encrypt(connection.password),
    };
  }
  return connection;
}

function decryptConnection(connection) {
  if (connection && connection.password && connection.password.startsWith('crypt:')) {
    return {
      ...connection,
      password: getEncryptor().decrypt(connection.password.substring('crypt:'.length)),
    };
  }
  return connection;
}

module.exports = {
  loadEncryptionKey,
  encryptConnection,
  decryptConnection,
};
