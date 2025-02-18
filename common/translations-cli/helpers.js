//@ts-check
const path = require('path');
const fs = require('fs');

/**
 * @param {string} file
 * @param {string[]} extensions
 *
 * @returns {boolean}
 */
function hasValidExtension(file, extensions) {
  return extensions.includes(path.extname(file).toLowerCase());
}

/**
 * @param {string} dir
 * @param {string[]} extensions
 *
 * @returns {Promise<string[]>}
 */
async function getFiles(dir, extensions) {
  const files = await fs.promises.readdir(dir);
  const allFiles = await Promise.all(
    files.map(async file => {
      const filePath = path.join(dir, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.isDirectory()) {
        return getFiles(filePath, extensions);
      } else if (stats.isFile() && hasValidExtension(file, extensions)) {
        return filePath;
      }
      return null;
    })
  );

  const validFiles = /** @type {string[]} */ (allFiles.flat().filter(file => file !== null));

  return validFiles;
}

/**
 * @param {string | string[]} value
 *
 * @returns {string}
 */
function formatDefaultValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return value;
}

const scriptDir = getScriptDir();
/** @param {string} file
 *
 * @returns {string}
 */
function resolveFile(file) {
  if (path.isAbsolute(file)) {
    return file;
  }

  return path.resolve(scriptDir, '..', '..', file);
}

/** @param {string[]} dirs
 *
 * @returns {string[]}
 */
function resolveDirs(dirs) {
  return dirs.map(resolveFile);
}

/**
 * @param {string[]} extensions
 *
 * @returns {string[]}
 */
function resolveExtensions(extensions) {
  return extensions.map(ext => (ext.startsWith('.') ? ext : `.${ext}`));
}

function getScriptDir() {
  if (require.main?.filename) {
    return path.dirname(require.main.filename);
  }

  if ('pkg' in process && process.pkg) {
    return path.dirname(process.execPath);
  }

  return __dirname;
}

/**
 * @param {string} file
 */
function ensureFileDirExists(file) {
  const dir = path.dirname(file);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * @param {Record<string, string>} existingTranslations - Previously extracted translations
 * @param {Record<string, string>} newTranslations - Newly extracted translations
 * @returns {{ added: string[], removed: string[], updated: string[] }} Translation changes
 */
const getTranslationChanges = (existingTranslations, newTranslations) => {
  const existingKeys = new Set(Object.keys(existingTranslations || {}));
  const newKeys = new Set(Object.keys(newTranslations));

  const added = [...newKeys].filter(key => !existingKeys.has(key));
  const removed = [...existingKeys].filter(key => !newKeys.has(key));
  const updated = [...newKeys].filter(
    key => existingKeys.has(key) && existingTranslations[key] !== newTranslations[key]
  );

  return { added, removed, updated };
};

module.exports = {
  hasValidExtension,
  getFiles,
  formatDefaultValue,
  resolveFile,
  resolveDirs,
  resolveExtensions,
  ensureFileDirExists,
  getTranslationChanges,
};
