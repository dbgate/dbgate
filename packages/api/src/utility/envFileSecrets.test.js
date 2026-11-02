const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveEnvFileSecrets } = require('./envFileSecrets');

describe('resolveEnvFileSecrets', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbgate-env-file-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeSecret(name, content) {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  test('loads value from file and strips trailing newline', () => {
    const env = {
      STORAGE_PASSWORD_FILE: writeSecret('pwd', 's3cr3t\n'),
      LOGIN_PASSWORD_admin_FILE: writeSecret('admin', 'adminpwd\r\n'),
    };
    const res = resolveEnvFileSecrets(env);
    expect(env.STORAGE_PASSWORD).toBe('s3cr3t');
    expect(env.LOGIN_PASSWORD_admin).toBe('adminpwd');
    expect(res.loaded.sort()).toEqual(['LOGIN_PASSWORD_admin', 'STORAGE_PASSWORD']);
  });

  test('keeps inner whitespace and only strips one trailing newline', () => {
    const env = { PASSWORD_FILE: writeSecret('pwd', ' a b \n\n') };
    resolveEnvFileSecrets(env);
    expect(env.PASSWORD).toBe(' a b \n');
  });

  test('direct value has precedence', () => {
    const env = { PASSWORD: 'direct', PASSWORD_FILE: writeSecret('pwd', 'fromfile') };
    const res = resolveEnvFileSecrets(env);
    expect(env.PASSWORD).toBe('direct');
    expect(res.skipped).toEqual(['PASSWORD']);
  });

  test('empty direct value is overridden by file', () => {
    const env = { PASSWORD: '', PASSWORD_FILE: writeSecret('pwd', 'fromfile') };
    resolveEnvFileSecrets(env);
    expect(env.PASSWORD).toBe('fromfile');
  });

  test('ignores variables which are file paths by design', () => {
    const env = {
      STORAGE_SSL_CA_FILE: writeSecret('ca', 'CERT'),
      STORAGE_SSL_CERT_FILE: writeSecret('cert', 'CERT'),
      STORAGE_SSL_KEY_FILE: writeSecret('key', 'KEY'),
      CLOUD_UPGRADE_FILE: '/nonexistent',
    };
    const res = resolveEnvFileSecrets(env);
    expect(env.STORAGE_SSL_CA).toBeUndefined();
    expect(env.STORAGE_SSL_CERT).toBeUndefined();
    expect(env.STORAGE_SSL_KEY).toBeUndefined();
    expect(env.CLOUD_UPGRADE).toBeUndefined();
    expect(res).toEqual({ loaded: [], skipped: [], errors: [] });
  });

  test('path variables can still be provided via file with double suffix', () => {
    const env = { STORAGE_SSL_CA_FILE_FILE: writeSecret('capath', '/etc/ssl/ca.pem\n') };
    resolveEnvFileSecrets(env);
    expect(env.STORAGE_SSL_CA_FILE).toBe('/etc/ssl/ca.pem');
  });

  test('reports unreadable file without throwing', () => {
    const env = { PASSWORD_FILE: path.join(tmpDir, 'missing') };
    const res = resolveEnvFileSecrets(env);
    expect(env.PASSWORD).toBeUndefined();
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].name).toBe('PASSWORD_FILE');
  });

  test('ignores bare _FILE and empty values', () => {
    const env = { _FILE: '/x', PASSWORD_FILE: '' };
    const res = resolveEnvFileSecrets(env);
    expect(res).toEqual({ loaded: [], skipped: [], errors: [] });
    expect(env.PASSWORD).toBeUndefined();
  });
});
