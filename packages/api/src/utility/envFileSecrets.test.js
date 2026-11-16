const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveEnvFileSecrets, MAX_SECRET_FILE_SIZE } = require('./envFileSecrets');

const STANDARD_PATH_VARIABLES = [
  'SSL_CERT_FILE',
  'NIX_SSL_CERT_FILE',
  'AWS_CONFIG_FILE',
  'AWS_SHARED_CREDENTIALS_FILE',
  'AWS_WEB_IDENTITY_TOKEN_FILE',
  'AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE',
  'AZURE_FEDERATED_TOKEN_FILE',
];

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

  test('removes consumed reference variables', () => {
    const env = {
      LOGIN_PASSWORD_admin_FILE: writeSecret('admin', 'adminpwd'),
      PASSWORD: 'direct',
      PASSWORD_FILE: writeSecret('pwd', 'fromfile'),
      SECRET_FILE: path.join(tmpDir, 'missing'),
    };
    resolveEnvFileSecrets(env);
    expect(Object.keys(env).sort()).toEqual(['LOGIN_PASSWORD_admin', 'PASSWORD']);
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
    const before = { ...env };
    const res = resolveEnvFileSecrets(env);
    expect(env).toEqual(before);
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
    expect(env).toEqual({ _FILE: '/x' });
  });

  test('result has exactly loaded, skipped and errors keys', () => {
    const env = { PASSWORD_FILE: writeSecret('pwd', 'x'), SECRET_FILE: path.join(tmpDir, 'missing') };
    expect(Object.keys(resolveEnvFileSecrets(env)).sort()).toEqual(['errors', 'loaded', 'skipped']);
    expect(resolveEnvFileSecrets({})).toEqual({ loaded: [], skipped: [], errors: [] });
  });

  test.each(STANDARD_PATH_VARIABLES)('leaves standard path variable %s untouched', varName => {
    const env = { [varName]: writeSecret('file', 'CONTENT') };
    const before = { ...env };
    const res = resolveEnvFileSecrets(env);
    expect(env).toEqual(before);
    expect(env[varName.slice(0, -'_FILE'.length)]).toBeUndefined();
    expect(res).toEqual({ loaded: [], skipped: [], errors: [] });
  });

  test('leaves standard path variables untouched when file is missing or larger than 128 KiB', () => {
    const env = {
      SSL_CERT_FILE: writeSecret('ca-bundle.crt', 'x'.repeat(220 * 1024)),
      NIX_SSL_CERT_FILE: path.join(tmpDir, 'missing-ca'),
      AWS_SHARED_CREDENTIALS_FILE: path.join(tmpDir, 'missing-credentials'),
    };
    const before = { ...env };
    const res = resolveEnvFileSecrets(env);
    expect(env).toEqual(before);
    expect(env.SSL_CERT).toBeUndefined();
    expect(res).toEqual({ loaded: [], skipped: [], errors: [] });
  });

  test('MAX_SECRET_FILE_SIZE is exported and equals 64 KiB', () => {
    expect(MAX_SECRET_FILE_SIZE).toBe(65536);
  });

  test('loads file of exactly MAX_SECRET_FILE_SIZE bytes', () => {
    const content = 'a'.repeat(MAX_SECRET_FILE_SIZE);
    const env = { FOO_FILE: writeSecret('foo', content) };
    const res = resolveEnvFileSecrets(env);
    expect(env.FOO).toHaveLength(65536);
    expect(env.FOO).toBe(content);
    expect(env.FOO_FILE).toBeUndefined();
    expect(res).toEqual({ loaded: ['FOO'], skipped: [], errors: [] });
  });

  function writeOversized(name, extra = 1) {
    return writeSecret(name, 'a'.repeat(65536 + extra));
  }

  function expectTooLargeError(res, name) {
    expect(res.loaded).toEqual([]);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].name).toBe(name);
    expect(res.errors[0].error).toMatch(/too large/i);
  }

  test.each([
    ['one byte over the limit', 1],
    ['far over the limit', 200 * 1024],
  ])('fails closed for file %s', (_label, extra) => {
    const env = { FOO_FILE: writeOversized('foo', extra) };
    const res = resolveEnvFileSecrets(env);
    expect(env).toEqual({});
    expectTooLargeError(res, 'FOO_FILE');
  });

  test('oversized PASSWORD_FILE is removed and reported', () => {
    const env = { LOGIN: 'admin', PASSWORD_FILE: writeOversized('pwd') };
    const res = resolveEnvFileSecrets(env);
    expect(env).toEqual({ LOGIN: 'admin' });
    expectTooLargeError(res, 'PASSWORD_FILE');
  });

  test('oversized LOGIN_PASSWORD_admin_FILE leaves neither reference nor value in env', () => {
    const env = { LOGIN_PASSWORD_admin_FILE: writeOversized('admin') };
    const res = resolveEnvFileSecrets(env);
    expect(env).toEqual({});
    expect('LOGIN_PASSWORD_admin_FILE' in env).toBe(false);
    expect('LOGIN_PASSWORD_admin' in env).toBe(false);
    expectTooLargeError(res, 'LOGIN_PASSWORD_admin_FILE');
  });

  test('oversized file with non-empty direct value is skipped without error', () => {
    const env = { PASSWORD: 'direct', PASSWORD_FILE: writeOversized('pwd') };
    const res = resolveEnvFileSecrets(env);
    expect(env).toEqual({ PASSWORD: 'direct' });
    expect(res).toEqual({ loaded: [], skipped: ['PASSWORD'], errors: [] });
  });

  test('oversized file with empty direct value keeps empty value and reports error', () => {
    const env = { PASSWORD: '', PASSWORD_FILE: writeOversized('pwd') };
    const res = resolveEnvFileSecrets(env);
    expect(env).toEqual({ PASSWORD: '' });
    expectTooLargeError(res, 'PASSWORD_FILE');
  });
});
