const crypto = require('crypto');
const simpleEncryptor = require('simple-encryptor');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const { datadir } = require('./directories');
const { encryptionKeyArg } = require('./processArgs');

const defaultEncryptionKey = 'mQAUaXhavRGJDxDTXSCg7Ej0xMmGCrx6OKA07DIMBiDcYYkvkaXjTAzPUEHEHEf9';

let _encryptionKey = null;

function loadEncryptionKey() {
  if (encryptionKeyArg) {
    return encryptionKeyArg;
  }
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

async function loadEncryptionKeyFromExternal(storedValue, setStoredValue) {
  const encryptor = simpleEncryptor.createEncryptor(defaultEncryptionKey);

  if (!storedValue) {
    const generatedKey = crypto.randomBytes(32);
    const newKey = generatedKey.toString('hex');
    const result = {
      encryptionKey: newKey,
    };
    await setStoredValue(encryptor.encrypt(result));

    setEncryptionKey(newKey);

    return;
  }

  const data = encryptor.decrypt(storedValue);
  setEncryptionKey(data['encryptionKey']);
}

let _encryptor = null;

function getInternalEncryptor() {
  if (_encryptor) {
    return _encryptor;
  }
  _encryptor = simpleEncryptor.createEncryptor(loadEncryptionKey());
  return _encryptor;
}

function encryptPasswordString(password) {
  if (password && !password.startsWith('crypt:')) {
    return 'crypt:' + getInternalEncryptor().encrypt(password);
  }
  return password;
}

function decryptPasswordString(password) {
  if (password && password.startsWith('crypt:')) {
    return getInternalEncryptor().decrypt(password.substring('crypt:'.length));
  }
  return password;
}

function encryptObjectPasswordField(obj, field, encryptor = null) {
  if (obj && obj[field] && !obj[field].startsWith('crypt:')) {
    return {
      ...obj,
      [field]: 'crypt:' + (encryptor || getInternalEncryptor()).encrypt(obj[field]),
    };
  }
  return obj;
}

function decryptObjectPasswordField(obj, field, encryptor = null) {
  if (obj && obj[field] && obj[field].startsWith('crypt:')) {
    return {
      ...obj,
      [field]: (encryptor || getInternalEncryptor()).decrypt(obj[field].substring('crypt:'.length)),
    };
  }
  return obj;
}

const fieldsToEncrypt = ['password', 'sshPassword', 'sshKeyfilePassword', 'connectionDefinition'];

function encryptConnection(connection, encryptor = null) {
  if (connection.passwordMode != 'saveRaw') {
    for (const field of fieldsToEncrypt) {
      connection = encryptObjectPasswordField(connection, field, encryptor);
    }
  }
  return connection;
}

function maskConnection(connection) {
  if (!connection) return connection;
  return _.omit(connection, fieldsToEncrypt);
}

function decryptConnection(connection) {
  for (const field of fieldsToEncrypt) {
    connection = decryptObjectPasswordField(connection, field);
  }
  return connection;
}

function encryptUser(user) {
  if (user.encryptPassword) {
    user = encryptObjectPasswordField(user, 'password');
  }
  return user;
}

function decryptUser(user) {
  user = decryptObjectPasswordField(user, 'password');
  return user;
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

function setEncryptionKey(encryptionKey) {
  _encryptionKey = encryptionKey;
  _encryptor = null;
  global.ENCRYPTION_KEY = encryptionKey;
}

function getEncryptionKey() {
  return _encryptionKey;
}

function generateTransportEncryptionKey() {
  const encryptor = simpleEncryptor.createEncryptor(defaultEncryptionKey);
  const result = {
    encryptionKey: crypto.randomBytes(32).toString('hex'),
  };
  return encryptor.encrypt(result);
}

function createTransportEncryptor(encryptionData) {
  const encryptor = simpleEncryptor.createEncryptor(defaultEncryptionKey);
  const data = encryptor.decrypt(encryptionData);
  const res = simpleEncryptor.createEncryptor(data['encryptionKey']);
  return res;
}

function recryptObjectPasswordField(obj, field, decryptEncryptor, encryptEncryptor) {
  if (obj && obj[field] && obj[field].startsWith('crypt:')) {
    return {
      ...obj,
      [field]: 'crypt:' + encryptEncryptor.encrypt(decryptEncryptor.decrypt(obj[field].substring('crypt:'.length))),
    };
  }
  return obj;
}

function recryptObjectPasswordFieldInPlace(obj, field, decryptEncryptor, encryptEncryptor) {
  if (obj && obj[field] && obj[field].startsWith('crypt:')) {
    obj[field] = 'crypt:' + encryptEncryptor.encrypt(decryptEncryptor.decrypt(obj[field].substring('crypt:'.length)));
  }
}

function recryptConnection(connection, decryptEncryptor, encryptEncryptor) {
  for (const field of fieldsToEncrypt) {
    connection = recryptObjectPasswordField(connection, field, decryptEncryptor, encryptEncryptor);
  }
  return connection;
}

function recryptUser(user, decryptEncryptor, encryptEncryptor) {
  user = recryptObjectPasswordField(user, 'password', decryptEncryptor, encryptEncryptor);
  return user;
}

module.exports = {
  loadEncryptionKey,
  encryptConnection,
  encryptUser,
  decryptUser,
  decryptConnection,
  maskConnection,
  pickSafeConnectionInfo,
  loadEncryptionKeyFromExternal,
  getEncryptionKey,
  setEncryptionKey,
  encryptPasswordString,
  decryptPasswordString,

  getInternalEncryptor,
  recryptConnection,
  recryptUser,
  generateTransportEncryptionKey,
  createTransportEncryptor,
  recryptObjectPasswordField,
  recryptObjectPasswordFieldInPlace,
};
