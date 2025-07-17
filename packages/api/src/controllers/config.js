const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { datadir, getLogsFilePath } = require('../utility/directories');
const { hasPermission } = require('../utility/hasPermission');
const socket = require('../utility/socket');
const _ = require('lodash');
const AsyncLock = require('async-lock');
const jwt = require('jsonwebtoken');

const processArgs = require('../utility/processArgs');
const currentVersion = require('../currentVersion');
const platformInfo = require('../utility/platformInfo');
const connections = require('../controllers/connections');
const { getAuthProviderFromReq } = require('../auth/authProvider');
const { checkLicense, checkLicenseKey } = require('../utility/checkLicense');
const storage = require('./storage');
const { getAuthProxyUrl, tryToGetRefreshedLicense } = require('../utility/authProxy');
const { getPublicHardwareFingerprint } = require('../utility/hardwareFingerprint');
const { extractErrorMessage } = require('dbgate-tools');
const {
  generateTransportEncryptionKey,
  createTransportEncryptor,
  recryptConnection,
  getInternalEncryptor,
  recryptUser,
  recryptObjectPasswordFieldInPlace,
} = require('../utility/crypting');

const lock = new AsyncLock();
let cachedSettingsValue = null;

module.exports = {
  // settingsValue: {},

  // async _init() {
  //   try {
  //     this.settingsValue = JSON.parse(await fs.readFile(path.join(datadir(), 'settings.json'), { encoding: 'utf-8' }));
  //   } catch (err) {
  //     this.settingsValue = {};
  //   }
  // },

  get_meta: true,
  async get(_params, req) {
    const authProvider = getAuthProviderFromReq(req);
    const login = authProvider.getCurrentLogin(req);
    const permissions = authProvider.getCurrentPermissions(req);
    const isUserLoggedIn = authProvider.isUserLoggedIn(req);

    const singleConid = authProvider.getSingleConnectionId(req);
    const storageConnectionError = storage.getStorageConnectionError();

    const singleConnection =
      singleConid && !storageConnectionError
        ? await connections.getCore({ conid: singleConid })
        : connections.singleConnection;

    let configurationError = null;
    if (process.env.STORAGE_DATABASE && process.env.BASIC_AUTH) {
      configurationError =
        'Basic authentization is not allowed, when using storage. Cannot use both STORAGE_DATABASE and BASIC_AUTH';
    }

    if (storageConnectionError && !configurationError) {
      configurationError = extractErrorMessage(storageConnectionError);
    }

    const checkedLicense = storageConnectionError ? null : await checkLicense();
    const isLicenseValid = checkedLicense?.status == 'ok';
    const logoutUrl = storageConnectionError ? null : await authProvider.getLogoutUrl();
    const adminConfig = storageConnectionError ? null : await storage.readConfig({ group: 'admin' });

    storage.startRefreshLicense();

    const isAdminPasswordMissing = !!(
      process.env.STORAGE_DATABASE &&
      !process.env.ADMIN_PASSWORD &&
      !process.env.BASIC_AUTH &&
      !adminConfig?.adminPasswordState
    );

    const configResult = {
      runAsPortal: !!connections.portalConnections,
      singleDbConnection: connections.singleDbConnection,
      singleConnection: singleConnection,
      isUserLoggedIn,
      // hideAppEditor: !!process.env.HIDE_APP_EDITOR,
      allowShellConnection: platformInfo.allowShellConnection,
      allowShellScripting: platformInfo.allowShellScripting,
      isDocker: platformInfo.isDocker,
      isElectron: platformInfo.isElectron,
      isLicenseValid,
      isLicenseExpired: checkedLicense?.isExpired,
      trialDaysLeft:
        checkedLicense?.licenseTypeObj?.isTrial && !checkedLicense?.isExpired ? checkedLicense?.daysLeft : null,
      checkedLicense,
      configurationError,
      logoutUrl,
      permissions,
      login,
      // ...additionalConfigProps,
      isBasicAuth: !!process.env.BASIC_AUTH,
      isAdminLoginForm: !!(
        process.env.STORAGE_DATABASE &&
        (process.env.ADMIN_PASSWORD || adminConfig?.adminPasswordState == 'set') &&
        !process.env.BASIC_AUTH
      ),
      isAdminPasswordMissing,
      isInvalidToken: req?.isInvalidToken,
      skipAllAuth: !!process.env.SKIP_ALL_AUTH,
      adminPasswordState: adminConfig?.adminPasswordState,
      storageDatabase: process.env.STORAGE_DATABASE,
      logsFilePath: getLogsFilePath(),
      connectionsFilePath: path.join(
        datadir(),
        processArgs.runE2eTests ? 'connections-e2etests.jsonl' : 'connections.jsonl'
      ),
      supportCloudAutoUpgrade: !!process.env.CLOUD_UPGRADE_FILE,
      allowPrivateCloud: platformInfo.isElectron || !!process.env.ALLOW_DBGATE_PRIVATE_CLOUD,
      ...currentVersion,
      redirectToDbGateCloudLogin: !!process.env.REDIRECT_TO_DBGATE_CLOUD_LOGIN,
    };

    return configResult;
  },

  logout_meta: {
    method: 'get',
    raw: true,
  },
  logout(req, res) {
    res.status(401).send('Logged out<br><a href="../..">Back to DbGate</a>');
  },

  platformInfo_meta: true,
  async platformInfo() {
    return platformInfo;
  },

  getSettings_meta: true,
  async getSettings() {
    const res = await lock.acquire('settings', async () => {
      return await this.loadSettings();
    });
    return res;
  },

  async getCachedSettings() {
    if (!cachedSettingsValue) {
      cachedSettingsValue = await this.loadSettings();
    }
    return cachedSettingsValue;
  },

  deleteSettings_meta: true,
  async deleteSettings() {
    await fs.unlink(path.join(datadir(), processArgs.runE2eTests ? 'settings-e2etests.json' : 'settings.json'));
    return true;
  },

  fillMissingSettings(value) {
    const res = {
      ...value,
    };
    if (platformInfo.isElectron && value['app.useNativeMenu'] !== true && value['app.useNativeMenu'] !== false) {
      // res['app.useNativeMenu'] = os.platform() == 'darwin' ? true : false;
      res['app.useNativeMenu'] = false;
    }
    for (const envVar in process.env) {
      if (envVar.startsWith('SETTINGS_')) {
        const key = envVar.substring('SETTINGS_'.length);
        if (!res[key]) {
          res[key] = process.env[envVar];
        }
      }
    }
    return res;
  },

  async loadSettings() {
    try {
      if (process.env.STORAGE_DATABASE) {
        const settings = await storage.readConfig({ group: 'settings' });
        return this.fillMissingSettings(settings);
      } else {
        const settingsText = await fs.readFile(
          path.join(datadir(), processArgs.runE2eTests ? 'settings-e2etests.json' : 'settings.json'),
          { encoding: 'utf-8' }
        );
        return {
          ...this.fillMissingSettings(JSON.parse(settingsText)),
          'other.licenseKey': platformInfo.isElectron ? await this.loadLicenseKey() : undefined,
          // 'other.licenseKey': await this.loadLicenseKey(),
        };
      }
    } catch (err) {
      return this.fillMissingSettings({});
    }
  },

  async loadLicenseKey() {
    try {
      const licenseKey = await fs.readFile(path.join(datadir(), 'license.key'), { encoding: 'utf-8' });
      return licenseKey;
    } catch (err) {
      return null;
    }
  },

  saveLicenseKey_meta: true,
  async saveLicenseKey({ licenseKey, forceSave = false, tryToRenew = false }) {
    if (!forceSave) {
      const decoded = jwt.decode(licenseKey?.trim());
      if (!decoded) {
        return {
          status: 'error',
          errorMessage: 'Invalid license key',
        };
      }

      const { exp } = decoded;
      if (exp * 1000 < Date.now()) {
        let renewed = false;
        if (tryToRenew) {
          const newLicenseKey = await tryToGetRefreshedLicense(licenseKey);
          if (newLicenseKey.status == 'ok') {
            licenseKey = newLicenseKey.token;
            renewed = true;
          }
        }

        if (!renewed) {
          return {
            status: 'error',
            errorMessage: 'License key is expired',
          };
        }
      }
    }

    try {
      if (process.env.STORAGE_DATABASE) {
        await storage.writeConfig({ group: 'license', config: { licenseKey } });
        // await storageWriteConfig('license', { licenseKey });
      } else {
        await fs.writeFile(path.join(datadir(), 'license.key'), licenseKey);
      }
      socket.emitChanged(`config-changed`);
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'error',
        errorMessage: err.message,
      };
    }
  },

  startTrial_meta: true,
  async startTrial() {
    try {
      const fingerprint = await getPublicHardwareFingerprint();

      const resp = await axios.default.post(`${getAuthProxyUrl()}/trial-license`, {
        type: 'premium-trial',
        days: 30,
        fingerprint,
      });
      const { token } = resp.data;

      return await this.saveLicenseKey({ licenseKey: token });
    } catch (err) {
      return {
        status: 'error',
        errorMessage: err.message,
      };
    }
  },

  updateSettings_meta: true,
  async updateSettings(values, req) {
    if (!hasPermission(`settings/change`, req)) return false;
    cachedSettingsValue = null;

    const res = await lock.acquire('settings', async () => {
      const currentValue = await this.loadSettings();
      try {
        let updated = currentValue;
        if (process.env.STORAGE_DATABASE) {
          updated = {
            ...currentValue,
            ..._.mapValues(values, v => {
              if (v === true) return 'true';
              if (v === false) return 'false';
              return v;
            }),
          };
          await storage.writeConfig({
            group: 'settings',
            config: updated,
          });
        } else {
          updated = {
            ...currentValue,
            ..._.omit(values, ['other.licenseKey']),
          };
          await fs.writeFile(
            path.join(datadir(), processArgs.runE2eTests ? 'settings-e2etests.json' : 'settings.json'),
            JSON.stringify(updated, undefined, 2)
          );
          // this.settingsValue = updated;

          if (currentValue['other.licenseKey'] != values['other.licenseKey']) {
            await this.saveLicenseKey({ licenseKey: values['other.licenseKey'], forceSave: true });
            socket.emitChanged(`config-changed`);
          }
        }

        socket.emitChanged(`settings-changed`);
        return updated;
      } catch (err) {
        return false;
      }
    });
    return res;
  },

  changelog_meta: true,
  async changelog() {
    try {
      const resp = await axios.default.get('https://raw.githubusercontent.com/dbgate/dbgate/master/CHANGELOG.md');
      return resp.data;
    } catch (err) {
      return '';
    }
  },

  checkLicense_meta: true,
  async checkLicense({ licenseKey }) {
    const resp = await checkLicenseKey(licenseKey);
    return resp;
  },

  getNewLicense_meta: true,
  async getNewLicense({ oldLicenseKey }) {
    const newLicenseKey = await tryToGetRefreshedLicense(oldLicenseKey);
    const res = await checkLicenseKey(newLicenseKey.token);
    if (res.status == 'ok') {
      res.licenseKey = newLicenseKey.token;
    }
    return res;
  },

  recryptDatabaseForExport(db) {
    const encryptionKey = generateTransportEncryptionKey();
    const transportEncryptor = createTransportEncryptor(encryptionKey);

    const config = _.cloneDeep([
      ...(db.config?.filter(c => !(c.group == 'admin' && c.key == 'encryptionKey')) || []),
      { group: 'admin', key: 'encryptionKey', value: encryptionKey },
    ]);
    const adminPassword = config.find(c => c.group == 'admin' && c.key == 'adminPassword');
    recryptObjectPasswordFieldInPlace(adminPassword, 'value', getInternalEncryptor(), transportEncryptor);

    return {
      ...db,
      connections: db.connections?.map(conn => recryptConnection(conn, getInternalEncryptor(), transportEncryptor)),
      users: db.users?.map(conn => recryptUser(conn, getInternalEncryptor(), transportEncryptor)),
      config,
    };
  },

  recryptDatabaseFromImport(db) {
    const encryptionKey = db.config?.find(c => c.group == 'admin' && c.key == 'encryptionKey')?.value;
    if (!encryptionKey) {
      throw new Error('Missing encryption key in the database');
    }
    const config = _.cloneDeep(db.config || []).filter(c => !(c.group == 'admin' && c.key == 'encryptionKey'));
    const transportEncryptor = createTransportEncryptor(encryptionKey);

    const adminPassword = config.find(c => c.group == 'admin' && c.key == 'adminPassword');
    recryptObjectPasswordFieldInPlace(adminPassword, 'value', transportEncryptor, getInternalEncryptor());

    return {
      ...db,
      connections: db.connections?.map(conn => recryptConnection(conn, transportEncryptor, getInternalEncryptor())),
      users: db.users?.map(conn => recryptUser(conn, transportEncryptor, getInternalEncryptor())),
      config,
    };
  },

  exportConnectionsAndSettings_meta: true,
  async exportConnectionsAndSettings(_params, req) {
    if (!hasPermission(`admin/config`, req)) {
      throw new Error('Permission denied: admin/config');
    }

    if (connections.portalConnections) {
      throw new Error('Not allowed');
    }

    if (process.env.STORAGE_DATABASE) {
      const db = await storage.getExportedDatabase();
      return this.recryptDatabaseForExport(db);
    }

    return this.recryptDatabaseForExport({
      connections: (await connections.list(null, req)).map((conn, index) => ({
        ..._.omit(conn, ['_id']),
        id: index + 1,
        conid: conn._id,
      })),
    });
  },

  importConnectionsAndSettings_meta: true,
  async importConnectionsAndSettings({ db }, req) {
    if (!hasPermission(`admin/config`, req)) {
      throw new Error('Permission denied: admin/config');
    }

    if (connections.portalConnections) {
      throw new Error('Not allowed');
    }

    const recryptedDb = this.recryptDatabaseFromImport(db);
    if (process.env.STORAGE_DATABASE) {
      await storage.replicateImportedDatabase(recryptedDb);
    } else {
      await connections.importFromArray(
        recryptedDb.connections.map(conn => ({
          ..._.omit(conn, ['conid', 'id']),
          _id: conn.conid,
        }))
      );
    }

    return true;
  },
};
