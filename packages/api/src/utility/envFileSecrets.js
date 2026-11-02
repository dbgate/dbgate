const fs = require('fs');

// Docker-secrets style support: for any environment variable NAME_FILE, the content of the referenced file
// is loaded into NAME (eg. STORAGE_PASSWORD_FILE=/run/secrets/db_password sets STORAGE_PASSWORD).
// These variables already end with _FILE and hold a file path consumed directly by DbGate,
// so they must not be treated as secret file references.
const FILE_PATH_VARIABLES = new Set([
  'CLOUD_UPGRADE_FILE',
  'STORAGE_SSL_CA_FILE',
  'STORAGE_SSL_CERT_FILE',
  'STORAGE_SSL_KEY_FILE',
]);

const FILE_SUFFIX = '_FILE';

/**
 * Resolves NAME_FILE environment variables into NAME.
 * @param {Record<string, string | undefined>} env - environment object, modified in place
 * @param {(path: string) => string} [readFile]
 * @returns {{ loaded: string[], skipped: string[], errors: { name: string, error: string }[] }}
 */
function resolveEnvFileSecrets(env, readFile = filePath => fs.readFileSync(filePath, { encoding: 'utf-8' })) {
  const result = { loaded: [], skipped: [], errors: [] };

  for (const fileVarName of Object.keys(env)) {
    if (!fileVarName.endsWith(FILE_SUFFIX) || fileVarName.length <= FILE_SUFFIX.length) continue;
    if (FILE_PATH_VARIABLES.has(fileVarName)) continue;

    const filePath = env[fileVarName];
    if (!filePath) continue;

    const name = fileVarName.slice(0, -FILE_SUFFIX.length);
    if (env[name] !== undefined && env[name] !== '') {
      // explicitly set value wins
      result.skipped.push(name);
      continue;
    }

    try {
      // strip a single trailing newline, usually added by editors and `echo`
      env[name] = readFile(filePath).replace(/\r?\n$/, '');
      result.loaded.push(name);
    } catch (err) {
      result.errors.push({ name: fileVarName, error: err.message });
    }
  }

  return result;
}

module.exports = {
  resolveEnvFileSecrets,
  FILE_PATH_VARIABLES,
};
