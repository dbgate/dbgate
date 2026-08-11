const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { z } = require('zod');

const { encryptPasswordString, decryptPasswordString } = require('../utility/crypting');
const { datadir } = require('../utility/directories');
const processArgs = require('../utility/processArgs');

const credentialsSchema = z
  .object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresAt: z.number().finite(),
    accountId: z.string().min(1).optional().catch(undefined),
  })
  .transform(({ accountId, ...credentials }) => (accountId ? { ...credentials, accountId } : credentials));

function getCredentialsPath() {
  return path.join(datadir(), processArgs.runE2eTests ? 'codex-oauth-e2etests.json' : 'codex-oauth.json');
}

function validateCredentials(value) {
  const result = credentialsSchema.safeParse(value);
  if (!result.success) {
    throw new Error('DBGM-00000 Stored Codex credentials are invalid');
  }
  return result.data;
}

async function readCredentials() {
  let encrypted;
  try {
    encrypted = await fs.readFile(getCredentialsPath(), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw new Error('DBGM-00000 Could not read Codex credentials');
  }

  try {
    const decrypted = decryptPasswordString(encrypted);
    return validateCredentials(JSON.parse(decrypted));
  } catch (error) {
    if (error?.message?.startsWith('DBGM-00000')) throw error;
    throw new Error('DBGM-00000 Could not decrypt Codex credentials');
  }
}

async function writeCredentials(credentials) {
  const checked = validateCredentials(credentials);
  const destination = getCredentialsPath();
  const temporary = `${destination}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  const encrypted = encryptPasswordString(JSON.stringify(checked));

  try {
    await fs.writeFile(temporary, encrypted, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await fs.rename(temporary, destination);
    await fs.chmod(destination, 0o600);
  } catch (error) {
    try {
      await fs.unlink(temporary);
    } catch {}
    throw new Error('DBGM-00000 Could not save Codex credentials');
  }
}

async function clearCredentials() {
  try {
    await fs.unlink(getCredentialsPath());
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw new Error('DBGM-00000 Could not remove Codex credentials');
    }
  }
}

module.exports = {
  clearCredentials,
  getCredentialsPath,
  readCredentials,
  writeCredentials,
};
