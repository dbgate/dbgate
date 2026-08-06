const fs = require('fs/promises');
const os = require('os');
const path = require('path');

let mockDirectory;

jest.mock('../utility/directories', () => ({ datadir: () => mockDirectory }));
jest.mock('../utility/processArgs', () => ({ runE2eTests: false }));
jest.mock('../utility/crypting', () => ({
  encryptPasswordString: value => `crypt:${Buffer.from(value).toString('base64')}`,
  decryptPasswordString: value => Buffer.from(value.substring('crypt:'.length), 'base64').toString('utf8'),
}));

const credentialsStore = require('./credentials');

async function writeEncryptedFixture(value) {
  const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
  const encrypted = `crypt:${Buffer.from(plaintext).toString('base64')}`;
  await fs.writeFile(credentialsStore.getCredentialsPath(), encrypted, 'utf8');
}

describe('Codex credential storage', () => {
  beforeEach(async () => {
    mockDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dbgate-codex-credentials-'));
  });

  afterEach(async () => {
    await fs.rm(mockDirectory, { recursive: true, force: true });
  });

  test('writes encrypted credentials atomically with owner-only permissions', async () => {
    const credentials = {
      accessToken: 'access-secret',
      refreshToken: 'refresh-secret',
      expiresAt: Date.now() + 60_000,
      accountId: 'account-1',
    };

    await credentialsStore.writeCredentials(credentials);

    const filePath = credentialsStore.getCredentialsPath();
    const fileContents = await fs.readFile(filePath, 'utf8');
    const fileMode = (await fs.stat(filePath)).mode & 0o777;
    const files = await fs.readdir(mockDirectory);

    expect(fileContents).toMatch(/^crypt:/);
    expect(fileContents).not.toContain(credentials.accessToken);
    expect(fileContents).not.toContain(credentials.refreshToken);
    expect(fileMode).toBe(0o600);
    expect(files).toEqual(['codex-oauth.json']);
    await expect(credentialsStore.readCredentials()).resolves.toEqual(credentials);
  });

  test('strips unknown credential keys before encrypting and reading', async () => {
    const credentials = {
      accessToken: 'access-secret',
      refreshToken: 'refresh-secret',
      expiresAt: Date.now() + 60_000,
      accountId: 'account-1',
      tokenType: 'Bearer',
      profile: { email: 'private@example.com' },
    };

    await credentialsStore.writeCredentials(credentials);

    const encrypted = await fs.readFile(credentialsStore.getCredentialsPath(), 'utf8');
    const plaintext = Buffer.from(encrypted.substring('crypt:'.length), 'base64').toString('utf8');
    const expected = {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      accountId: credentials.accountId,
    };

    expect(JSON.parse(plaintext)).toEqual(expected);
    await expect(credentialsStore.readCredentials()).resolves.toEqual(expected);
  });

  test.each([null, '', 42, { unexpected: true }])('omits malformed optional account ID %#', async accountId => {
    const credentials = {
      accessToken: 'access-secret',
      refreshToken: 'refresh-secret',
      expiresAt: Date.now() + 60_000,
      accountId,
    };

    await credentialsStore.writeCredentials(credentials);

    await expect(credentialsStore.readCredentials()).resolves.toEqual({
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
    });
  });

  test.each([
    ['null', null],
    ['an array', []],
    ['a missing access token', { refreshToken: 'refresh', expiresAt: 1 }],
    ['an empty access token', { accessToken: '', refreshToken: 'refresh', expiresAt: 1 }],
    ['a non-string refresh token', { accessToken: 'access', refreshToken: 42, expiresAt: 1 }],
    ['a missing expiry', { accessToken: 'access', refreshToken: 'refresh' }],
    ['a non-finite expiry', { accessToken: 'access', refreshToken: 'refresh', expiresAt: null }],
  ])('rejects stored credentials shaped as %s', async (_label, value) => {
    await writeEncryptedFixture(value);

    await expect(credentialsStore.readCredentials()).rejects.toThrow('DBGM-00000 Stored Codex credentials are invalid');
  });

  test('rejects malformed encrypted JSON with a sanitized error', async () => {
    await writeEncryptedFixture('{"accessToken":"secret-value"');

    let error;
    try {
      await credentialsStore.readCredentials();
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('DBGM-00000 Could not decrypt Codex credentials');
    expect(error.message).not.toContain('secret-value');
  });

  test.each([
    undefined,
    {},
    { accessToken: 'access', refreshToken: '', expiresAt: 1 },
    { accessToken: 'access', refreshToken: 'refresh', expiresAt: Number.POSITIVE_INFINITY },
  ])('does not write malformed credentials %#', async value => {
    await expect(credentialsStore.writeCredentials(value)).rejects.toThrow(
      'DBGM-00000 Stored Codex credentials are invalid'
    );
    await expect(fs.readdir(mockDirectory)).resolves.toEqual([]);
  });

  test('clears credentials without failing when the file is already absent', async () => {
    await expect(credentialsStore.clearCredentials()).resolves.toBeUndefined();
    await expect(credentialsStore.readCredentials()).resolves.toBeNull();
  });
});
