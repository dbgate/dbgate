//@ts-check
const fs = require('fs');
const { promisify } = require('util');

const { getFiles } = require('./helpers');

const readFilePromise = promisify(fs.readFile);

const translationRegex = /_t\(\s*['"]([^'"]+)['"]\s*,\s*\{\s*defaultMessage\s*:\s*['"]([^'"]+)['"]\s*\}/g;

/**
 * @param {string} file
 *
 * @returns {Promise<Record<string, string>>}
 */
async function extractTranslationsFromFile(file) {
  /** @type {Record<string, string>} */
  const translations = {};
  const content = await readFilePromise(file, 'utf-8');
  let match;

  while ((match = translationRegex.exec(content)) !== null) {
    const [_, key, defaultText] = match;
    translations[key] = defaultText;
  }

  return translations;
}

/** @typedef {{ ignoreDuplicates?: boolean }} ExtractOptions */

/**
 * @param {string[]} directories
 * @param {string[]} extensions
 * @param {ExtractOptions} options
 *
 * @returns {Promise<Record<string, string>>}
 */
async function extractAllTranslations(directories, extensions, options = {}) {
  const { ignoreDuplicates } = options;

  try {
    /** @type {Record<string, string>} */
    const allTranslations = {};
    /** @type {Record<string, string[]>} */
    const translationKeyToFiles = {};

    for (const dir of directories) {
      const files = await getFiles(dir, extensions);

      for (const file of files) {
        const fileTranslations = await extractTranslationsFromFile(file);

        for (const key in fileTranslations) {
          if (!translationKeyToFiles[key]) {
            translationKeyToFiles[key] = [];
          }

          translationKeyToFiles[key].push(file);

          if (!ignoreDuplicates && allTranslations[key] && allTranslations[key] !== fileTranslations[key]) {
            console.error(
              `Different translations for the same key [${key}] found. ${file}: ${
                fileTranslations[key]
              }. Previous value: ${allTranslations[key]} was found in ${translationKeyToFiles[key].join(', ')}`
            );
            throw new Error(`Duplicate translation key found: ${key}`);
          }

          allTranslations[key] = fileTranslations[key];
        }
      }
    }

    return allTranslations;
  } catch (error) {
    console.error('Error extracting translations:', error);
    throw error;
  }
}
module.exports = {
  extractTranslationsFromFile,
  extractAllTranslations,
};
